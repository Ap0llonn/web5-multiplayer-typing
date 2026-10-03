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
  expect((await heartbeat(outsider.cookie, room.value.code)).status).toBe(403);
  await prisma.session.deleteMany({ where: { userId: user.id } });
  expect((await heartbeat(cookie, room.value.code)).status).toBe(401);
});
