import { afterAll, expect, it } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { getCurrentActor } from "@/modules/identity/server";
import { getLobbyService } from "@/modules/lobby/server";
import { getRoomSnapshot, handleLobbyCommand } from "@/composition/lobby/http";
import { signup, testRequest } from "../support/auth";
const base = "http://localhost:3000";
afterAll(() => prisma.$disconnect());
async function actor(cookie: string) {
  const result = await getCurrentActor(new Headers({ cookie }));
  if (!result.ok) throw Error(result.error.code);
  return result.value;
}
function heartbeat(cookie: string, code: string, body = {}, origin = base) {
  return handleLobbyCommand(
    new Request(`${base}/api/lobbies/${code}/heartbeat`, {
      method: "POST",
      headers: { cookie, origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    "heartbeat",
    code,
  );
}
it("server-only observations never renew presence and reconcile an expired owner", async () => {
  const { cookie } = await signup(
    createAuthentication(),
    `observe${Date.now().toString().slice(-8)}`,
  );
  const owner = await actor(cookie);
  const room = await getLobbyService().createLobby(
    { name: "Observation", capacity: 2, role: "PARTICIPANT" },
    owner,
  );
  if (!room.ok) throw Error(room.error.code);
  const old = new Date(Date.now() - 12000);
  await prisma.lobbyMember.updateMany({
    where: { activePlayerIdentityId: owner.playerIdentityId },
    data: { lastSeenAt: old },
  });
  const snapshot = await getRoomSnapshot(
    new Headers({ cookie }),
    room.value.code,
  );
  expect(snapshot).toMatchObject({
    ok: true,
    value: { members: [{ online: false }] },
  });
  const stored = await prisma.lobbyMember.findUniqueOrThrow({
    where: { activePlayerIdentityId: owner.playerIdentityId },
  });
  expect(stored.lastSeenAt).toEqual(old);
  await prisma.lobbyMember.update({
    where: { id: stored.id },
    data: { lastSeenAt: new Date(Date.now() - 31000) },
  });
  expect(
    (await getRoomSnapshot(new Headers({ cookie }), room.value.code)).ok,
  ).toBe(false);
  expect(
    await prisma.lobbyMember.findUnique({
      where: { activePlayerIdentityId: owner.playerIdentityId },
    }),
  ).toBeNull();
  expect(
    await prisma.lobby.findUnique({ where: { id: room.value.id } }),
  ).toMatchObject({ state: "CLOSED" });
});
it("client heartbeats refresh only their verified membership and reject forged or revoked requests", async () => {
  const auth = createAuthentication();
  const { cookie, user } = await signup(
    auth,
    `beat${Date.now().toString().slice(-8)}`,
  );
  const owner = await actor(cookie);
  const guestResponse = await testRequest(auth, "/sign-in/anonymous", {
    name: "Heartbeat Guest",
  });
  expect(guestResponse.status).toBe(200);
  const guestCookie =
    guestResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
  const guest = await actor(guestCookie);
  const service = getLobbyService();
  const room = await service.createLobby(
    { name: "Client heartbeat", capacity: 2, role: "PARTICIPANT" },
    owner,
  );
  if (!room.ok) throw Error(room.error.code);
  expect(
    (await service.joinLobby(room.value.code, "PARTICIPANT", guest)).ok,
  ).toBe(true);
  const old = new Date(Date.now() - 12000);
  await prisma.lobbyMember.updateMany({
    where: { lobbyId: room.value.id },
    data: { lastSeenAt: old },
  });
  expect((await heartbeat(cookie, room.value.code)).status).toBe(200);
  expect(
    (
      await prisma.lobbyMember.findUniqueOrThrow({
        where: { activePlayerIdentityId: owner.playerIdentityId },
      })
    ).lastSeenAt.getTime(),
  ).toBeGreaterThan(old.getTime());
  expect(
    (
      await prisma.lobbyMember.findUniqueOrThrow({
        where: { activePlayerIdentityId: guest.playerIdentityId },
      })
    ).lastSeenAt,
  ).toEqual(old);
  expect((await heartbeat(guestCookie, room.value.code)).status).toBe(200);
  expect(
    (
      await heartbeat(cookie, room.value.code, {
        playerIdentityId: guest.playerIdentityId,
      })
    ).status,
  ).toBe(400);
  expect(
    (await heartbeat(cookie, room.value.code, {}, "https://foreign.example"))
      .status,
  ).toBe(403);
  const outsider = await signup(
    auth,
    `outside${Date.now().toString().slice(-8)}`,
  );
  for (const otherCode of [
    room.value.code,
    room.value.code.toLowerCase(),
    "ZZZZZZ",
  ]) {
    const refused = await heartbeat(outsider.cookie, otherCode);
    expect(refused.status).toBe(403);
    expect(await refused.json()).toEqual({
      ok: false,
      error: { code: "FORBIDDEN", messageKey: "errors.FORBIDDEN" },
    });
  }
  const outsiderActor = await actor(outsider.cookie);
  const outsiderRoom = await service.createLobby(
    { name: "Own room", capacity: 2, role: "PARTICIPANT" },
    outsiderActor,
  );
  if (!outsiderRoom.ok) throw Error(outsiderRoom.error.code);
  expect(
    (await heartbeat(outsider.cookie, outsiderRoom.value.code.toLowerCase()))
      .status,
  ).toBe(200);
  for (const otherCode of [room.value.code, "ZZZZZZ"]) {
    const refused = await heartbeat(outsider.cookie, otherCode);
    expect(refused.status).toBe(403);
    expect(await refused.json()).toEqual({
      ok: false,
      error: { code: "FORBIDDEN", messageKey: "errors.FORBIDDEN" },
    });
  }
  expect(
    (await service.leaveLobby(outsiderRoom.value.code, outsiderActor)).ok,
  ).toBe(true);
  const closed = await heartbeat(outsider.cookie, outsiderRoom.value.code);
  expect(closed.status).toBe(403);
  expect(await closed.json()).toEqual({
    ok: false,
    error: { code: "FORBIDDEN", messageKey: "errors.FORBIDDEN" },
  });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  expect((await heartbeat(cookie, room.value.code)).status).toBe(401);
});
it("leave cannot distinguish foreign from unknown codes, with or without another active room", async () => {
  const auth = createAuthentication();
  const owner = await signup(
    auth,
    `leaveown${Date.now().toString().slice(-8)}`,
  );
  const outsider = await signup(
    auth,
    `leaveout${Date.now().toString().slice(-8)}`,
  );
  const service = getLobbyService();
  const ownerActor = await actor(owner.cookie);
  const outsiderActor = await actor(outsider.cookie);
  const foreign = await service.createLobby(
    { name: "Foreign", capacity: 2, role: "PARTICIPANT" },
    ownerActor,
  );
  if (!foreign.ok) throw Error(foreign.error.code);
  const leave = (code: string) =>
    handleLobbyCommand(
      new Request(`${base}/api/lobbies/${code}/leave`, {
        method: "POST",
        headers: { cookie: outsider.cookie, origin: base },
      }),
      "leave",
      code,
    );
  for (const withActiveRoom of [false, true]) {
    const own = withActiveRoom
      ? await service.createLobby(
          { name: "Outsider own room", capacity: 2, role: "SPECTATOR" },
          outsiderActor,
        )
      : null;
    for (const code of [
      foreign.value.code,
      foreign.value.code.toLowerCase(),
      "ZZZZZZ",
    ]) {
      const refused = await leave(code);
      expect(refused.status).toBe(403);
      expect(await refused.json()).toEqual({
        ok: false,
        error: { code: "FORBIDDEN", messageKey: "errors.FORBIDDEN" },
      });
    }
    if (own) {
      if (!own.ok) throw Error(own.error.code);
      expect((await leave(own.value.code.toLowerCase())).status).toBe(200);
      const closed = await leave(own.value.code);
      expect(closed.status).toBe(403);
      expect(await closed.json()).toEqual({
        ok: false,
        error: { code: "FORBIDDEN", messageKey: "errors.FORBIDDEN" },
      });
      expect(
        await prisma.lobbyMember.findUnique({
          where: { activePlayerIdentityId: outsiderActor.playerIdentityId },
        }),
      ).toBeNull();
    }
    expect(
      await prisma.lobbyMember.findUnique({
        where: { activePlayerIdentityId: ownerActor.playerIdentityId },
      }),
    ).toMatchObject({ lobbyId: foreign.value.id });
  }
});
