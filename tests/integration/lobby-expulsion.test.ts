import { afterAll, expect, it } from "vitest";
import { getCurrentActor } from "@/modules/identity/server";
import { getLobbyService } from "@/modules/lobby/server";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { handleLobbyCommand } from "@/composition/lobby/http";
import { signup, testRequest } from "../support/auth";

async function account(label: string) {
  const { cookie } = await signup(
    createAuthentication(),
    `${label}${Date.now().toString().slice(-8)}`,
  );
  const actor = await getCurrentActor(new Headers({ cookie }));
  if (!actor.ok) throw Error(actor.error.code);
  return { actor: actor.value, cookie };
}

afterAll(() => prisma.$disconnect());

it("allows the authenticated host account to expel a human or spectator, persists the room-scoped ban, and rejects later access", async () => {
  const [
    { actor: host, cookie: hostCookie },
    { actor: target, cookie: targetCookie },
    outsider,
  ] = await Promise.all([
    account("host"),
    account("kicked"),
    account("outsider"),
  ]);
  const service = getLobbyService();
  const created = await service.createLobby(
    { name: "Expulsion", capacity: 3, role: "PARTICIPANT" },
    host,
  );
  if (!created.ok) throw Error(created.error.code);
  const joined = await service.joinLobby(
    created.value.code,
    "SPECTATOR",
    target,
  );
  expect(joined.ok).toBe(true);
  if (joined.ok)
    expect(
      joined.value.members.some(
        (member) =>
          member.playerIdentityId === target.playerIdentityId &&
          member.role === "SPECTATOR",
      ),
    ).toBe(true);

  const response = await handleLobbyCommand(
    new Request(
      `http://localhost:3000/api/lobbies/${created.value.code}/kick`,
      {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: hostCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({ playerIdentityId: target.playerIdentityId }),
      },
    ),
    "kick",
    created.value.code,
  );
  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.value.members).not.toEqual(
    expect.arrayContaining([{ playerIdentityId: target.playerIdentityId }]),
  );
  expect(JSON.stringify(payload)).not.toContain("bannedPlayerIdentityIds");
  expect(
    await prisma.lobbyBan.count({
      where: {
        lobbyId: created.value.id,
        playerIdentityId: target.playerIdentityId,
      },
    }),
  ).toBe(1);
  expect(
    await service.joinLobby(created.value.code, "PARTICIPANT", target),
  ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  expect(await service.heartbeat(created.value.code, target)).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
  expect(await service.observeLobby(created.value.code, target)).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
  expect(
    await service.joinLobby(created.value.code, "PARTICIPANT", outsider.actor),
  ).toMatchObject({ ok: true });
  expect(
    await service.joinLobby(created.value.code, "PARTICIPANT", target),
  ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  expect(targetCookie).toContain("better-auth");
});

it("rejects non-host, self, unknown targets, and non-strict kick payloads", async () => {
  const [
    { actor: host, cookie: hostCookie },
    { actor: target, cookie: targetCookie },
    { cookie: outsiderCookie },
  ] = await Promise.all([
    account("host"),
    account("member"),
    account("outsider"),
  ]);
  const service = getLobbyService();
  const created = await service.createLobby(
    { name: "Denied kick", capacity: 3, role: "PARTICIPANT" },
    host,
  );
  if (!created.ok) throw Error(created.error.code);
  await service.joinLobby(created.value.code, "PARTICIPANT", target);
  const command = (cookie: string, body: unknown) =>
    handleLobbyCommand(
      new Request(
        `http://localhost:3000/api/lobbies/${created.value.code}/kick`,
        {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            cookie,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        },
      ),
      "kick",
      created.value.code,
    );
  expect(
    (
      await command(outsiderCookie, {
        playerIdentityId: target.playerIdentityId,
      })
    ).status,
  ).toBe(403);
  expect(
    (await command(hostCookie, { playerIdentityId: host.playerIdentityId }))
      .status,
  ).toBe(403);
  expect(
    (await command(hostCookie, { playerIdentityId: "missing" })).status,
  ).toBe(403);
  expect(
    (
      await command(hostCookie, {
        playerIdentityId: target.playerIdentityId,
        role: "HOST",
      })
    ).status,
  ).toBe(400);
  expect(
    (await command(targetCookie, { playerIdentityId: host.playerIdentityId }))
      .status,
  ).toBe(403);
});

it("hides room-code existence from guests and nonmembers without reconciling either room", async () => {
  const [
    { actor: host },
    { actor: roomHost, cookie: roomHostCookie },
    { cookie: outsiderCookie },
  ] = await Promise.all([
    account("prhost"),
    account("otherhost"),
    account("prout"),
  ]);
  const service = getLobbyService();
  const [victimRoom, unrelatedRoom] = await Promise.all([
    service.createLobby(
      { name: "Probe target", capacity: 3, role: "PARTICIPANT" },
      host,
    ),
    service.createLobby(
      { name: "Unrelated", capacity: 2, role: "PARTICIPANT" },
      roomHost,
    ),
  ]);
  if (!victimRoom.ok || !unrelatedRoom.ok)
    throw new Error("Test rooms unavailable");
  const guestAuth = createAuthentication();
  const guestResponse = await testRequest(guestAuth, "/sign-in/anonymous", {
    name: "Probe Guest",
  });
  expect(guestResponse.status).toBe(200);
  const guestCookie =
    guestResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
  expect(guestCookie).not.toBe("");

  // An expired member makes an unauthorized mutation observable if it reaches
  // the room lock and runs presence reconciliation.
  const staleTarget = await account("sttarget");
  await service.joinLobby(
    victimRoom.value.code,
    "PARTICIPANT",
    staleTarget.actor,
  );
  await prisma.lobbyMember.updateMany({
    where: {
      lobbyId: victimRoom.value.id,
      playerIdentityId: staleTarget.actor.playerIdentityId,
    },
    data: { lastSeenAt: new Date(Date.now() - 31_000) },
  });
  const victimBeforeProbes = await prisma.lobby.findUniqueOrThrow({
    where: { id: victimRoom.value.id },
  });

  const kick = (cookie: string, code: string) =>
    handleLobbyCommand(
      new Request(`http://localhost:3000/api/lobbies/${code}/kick`, {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          playerIdentityId: staleTarget.actor.playerIdentityId,
        }),
      }),
      "kick",
      code,
    );
  const victimCode = victimRoom.value.code;
  const missingCode = "ZZZZZZ";
  expect(missingCode).not.toBe(victimCode);
  expect(missingCode).not.toBe(unrelatedRoom.value.code);
  const [
    guestExisting,
    guestMissing,
    outsiderExisting,
    outsiderMissing,
    otherHostMissing,
  ] = await Promise.all([
    kick(guestCookie, victimCode),
    kick(guestCookie, missingCode),
    kick(outsiderCookie, victimCode),
    kick(outsiderCookie, missingCode),
    kick(roomHostCookie, missingCode),
  ]);
  expect([
    guestExisting.status,
    guestMissing.status,
    outsiderExisting.status,
    outsiderMissing.status,
    otherHostMissing.status,
  ]).toEqual([403, 403, 403, 403, 403]);

  expect(
    await prisma.lobby.findUniqueOrThrow({
      where: { id: victimRoom.value.id },
    }),
  ).toMatchObject({ version: victimBeforeProbes.version, state: "WAITING" });
  expect(
    await prisma.lobbyMember.findUnique({
      where: { activePlayerIdentityId: staleTarget.actor.playerIdentityId },
    }),
  ).not.toBeNull();
  expect(
    await prisma.lobby.findUniqueOrThrow({
      where: { id: unrelatedRoom.value.id },
    }),
  ).toMatchObject({
    version: unrelatedRoom.value.version,
    state: "WAITING",
    hostPlayerIdentityId: roomHost.playerIdentityId,
  });
});

it("reconciles an expired host under the room lock before allowing a kick", async () => {
  const [{ actor: host }, { actor: target }, { actor: successor }] =
    await Promise.all([
      account("stalehost"),
      account("staletarget"),
      account("successor"),
    ]);
  const service = getLobbyService();
  const created = await service.createLobby(
    { name: "Expired host", capacity: 3, role: "PARTICIPANT" },
    host,
  );
  if (!created.ok) throw Error(created.error.code);
  await service.joinLobby(created.value.code, "SPECTATOR", successor);
  await service.joinLobby(created.value.code, "PARTICIPANT", target);
  await prisma.lobbyMember.updateMany({
    where: {
      lobbyId: created.value.id,
      playerIdentityId: host.playerIdentityId,
    },
    data: { lastSeenAt: new Date(Date.now() - 31_000) },
  });
  const staleHost = await prisma.lobbyMember.findUniqueOrThrow({
    where: { activePlayerIdentityId: host.playerIdentityId },
  });
  expect(Date.now() - staleHost.lastSeenAt.getTime()).toBeGreaterThan(30_000);

  expect(
    await service.kickLobby(created.value.code, target.playerIdentityId, host),
  ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  const afterExpiry = await prisma.lobby.findUniqueOrThrow({
    where: { id: created.value.id },
  });
  const eligibleSuccessors = await prisma.lobbyMember.findMany({
    where: {
      lobbyId: created.value.id,
      activePlayerIdentityId: { not: null },
      playerIdentityId: { not: host.playerIdentityId },
      kind: "account",
    },
    orderBy: [{ joinedAt: "asc" }, { playerIdentityId: "asc" }],
  });
  expect(afterExpiry.hostPlayerIdentityId).toBe(
    eligibleSuccessors[0]?.playerIdentityId,
  );
  expect(afterExpiry.hostPlayerIdentityId).not.toBe(host.playerIdentityId);
  expect(
    await prisma.lobbyMember.count({
      where: {
        lobbyId: created.value.id,
        activePlayerIdentityId: host.playerIdentityId,
      },
    }),
  ).toBe(0);
  expect(
    await prisma.lobbyBan.count({ where: { lobbyId: created.value.id } }),
  ).toBe(0);

  expect(
    await service.kickLobby(
      created.value.code,
      target.playerIdentityId,
      successor,
    ),
  ).toMatchObject({ ok: true });
});

it("serializes a concurrent rejoin against expulsion so the target ends banned and inactive", async () => {
  const [{ actor: host }, { actor: target }] = await Promise.all([
    account("racehost"),
    account("racetarget"),
  ]);
  const service = getLobbyService();
  const created = await service.createLobby(
    { name: "Concurrent expulsion", capacity: 2, role: "PARTICIPANT" },
    host,
  );
  if (!created.ok) throw Error(created.error.code);
  await service.joinLobby(created.value.code, "PARTICIPANT", target);
  const [kick] = await Promise.all([
    service.kickLobby(created.value.code, target.playerIdentityId, host),
    service.joinLobby(created.value.code, "PARTICIPANT", target),
  ]);
  expect(kick).toMatchObject({ ok: true });
  expect(
    await prisma.lobbyMember.count({
      where: {
        lobbyId: created.value.id,
        activePlayerIdentityId: target.playerIdentityId,
      },
    }),
  ).toBe(0);
  expect(
    await prisma.lobbyBan.count({
      where: {
        lobbyId: created.value.id,
        playerIdentityId: target.playerIdentityId,
      },
    }),
  ).toBe(1);
});
