import { it, expect, afterAll } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { getCurrentActor } from "@/modules/identity/server";
import { getLobbyService } from "@/modules/lobby/server";
import { signup } from "../support/auth";
async function account(n: string) {
  const { cookie } = await signup(
    createAuthentication(),
    `${n}${Date.now().toString().slice(-8)}`,
  );
  const r = await getCurrentActor(new Headers({ cookie }));
  if (!r.ok) throw Error(r.error.code);
  return r.value;
}
afterAll(() => prisma.$disconnect());
it("enforces one active room in the database and protects final slot under concurrency", async () => {
  const [host, a, b] = await Promise.all([
    account("host"),
    account("alpha"),
    account("bravo"),
  ]);
  const service = getLobbyService();
  const r = await service.createLobby(
    { name: "Concurrent", capacity: 2, role: "PARTICIPANT" },
    host,
  );
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const [x, y] = await Promise.all([
    service.joinLobby(r.value.code, "PARTICIPANT", a),
    service.joinLobby(r.value.code, "PARTICIPANT", b),
  ]);
  expect([x, y].filter((v) => v.ok)).toHaveLength(1);
  expect([x, y].filter((v) => !v.ok)).toMatchObject([
    { error: { code: "ROOM_FULL" } },
  ]);
  const joined = x.ok ? a : b;
  expect(
    (await service.joinLobby(r.value.code, "PARTICIPANT", joined)).ok,
  ).toBe(true);
  expect(
    await prisma.lobbyMember.count({
      where: {
        lobbyId: r.value.id,
        activePlayerIdentityId: joined.playerIdentityId,
      },
    }),
  ).toBe(1);
  expect(
    await service.createLobby(
      { name: "Second", capacity: 2, role: "SPECTATOR" },
      joined,
    ),
  ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  expect(await service.heartbeat(r.value.code, x.ok ? b : a)).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
  await service.leaveLobby(r.value.code, host);
  const current = await service.currentLobby(joined);
  expect(current).toMatchObject({
    ok: true,
    value: { hostPlayerIdentityId: joined.playerIdentityId },
  });
});
it("blocks guests from creation while accepting them as real members", async () => {
  const host = await account("owner");
  const service = getLobbyService();
  const guest = { ...(await account("guest")), kind: "guest" as const };
  expect(
    await service.createLobby(
      { name: "No", capacity: 2, role: "PARTICIPANT" },
      guest,
    ),
  ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  const room = await service.createLobby(
    { name: "Yes", capacity: 2, role: "SPECTATOR" },
    host,
  );
  if (!room.ok) throw Error(room.error.code);
  expect(
    await service.joinLobby(room.value.code, "PARTICIPANT", guest),
  ).toMatchObject({ ok: true });
});
it("concurrent creates cannot reserve two rooms for the same account", async () => {
  const actor = await account("single");
  const service = getLobbyService();
  const results = await Promise.all([
    service.createLobby(
      { name: "One", capacity: 2, role: "PARTICIPANT" },
      actor,
    ),
    service.createLobby({ name: "Two", capacity: 2, role: "SPECTATOR" }, actor),
  ]);
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  expect(
    await prisma.lobbyMember.count({
      where: { activePlayerIdentityId: actor.playerIdentityId },
    }),
  ).toBe(1);
});
