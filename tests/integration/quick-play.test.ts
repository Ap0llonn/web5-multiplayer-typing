import { afterEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { DefaultLobbySupervisor } from "@/modules/lobby/supervisors/implementations/default-lobby-supervisor";
import { PrismaLobbyRepository } from "@/modules/lobby/repositories/implementations/prisma-lobby-repository";
import type { CreateLobbyInput } from "@/modules/lobby/contracts/lobby";

const userIds: string[] = [];
const roomIds: string[] = [];
let now = Date.UTC(2035, 0, 1);
const service = new DefaultLobbySupervisor(
  new PrismaLobbyRepository(prisma),
  () => now,
);
afterEach(async () => {
  await prisma.lobby.deleteMany({ where: { id: { in: roomIds.splice(0) } } });
  const ids = userIds.splice(0);
  await prisma.playerIdentity.deleteMany({ where: { id: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  now = Date.UTC(2035, 0, 1);
});
async function actor() {
  const id = randomUUID();
  await prisma.user.create({
    data: {
      id,
      name: id,
      email: `${id}@example.test`,
      playerIdentity: { create: { id } },
    },
  });
  userIds.push(id);
  return { playerIdentityId: id, displayName: id, kind: "account" as const };
}
async function room(
  name: string,
  capacity: number,
  role: CreateLobbyInput["role"] = "PARTICIPANT",
  visibility: CreateLobbyInput["visibility"] = "PUBLIC",
) {
  const host = await actor();
  const result = await service.createLobby(
    { name, capacity, role, visibility },
    host,
  );
  if (!result.ok) throw Error(result.error.code);
  roomIds.push(result.value.id);
  return { ...result.value, host };
}
it("ranks by actual free participant slots, creation timestamp and ID, without allocating a seat or renewing presence", async () => {
  await room("large", 30);
  const oldest = await room("oldest", 2, "SPECTATOR");
  const newest = await room("newest", 3);
  await prisma.lobby.update({
    where: { id: oldest.id },
    data: { createdAt: new Date(1) },
  });
  await prisma.lobby.update({
    where: { id: newest.id },
    data: { createdAt: new Date(2) },
  });
  const before = await prisma.lobbyMember.findMany({
    where: { lobbyId: { in: roomIds } },
    orderBy: { id: "asc" },
  });
  expect(await service.findQuickLobby()).toMatchObject({
    ok: true,
    value: { code: oldest.code, participantCount: 0, spectatorCount: 1 },
  });
  await prisma.lobby.update({
    where: { id: newest.id },
    data: { createdAt: new Date(1) },
  });
  expect(await service.findQuickLobby()).toMatchObject({
    ok: true,
    value: { code: oldest.id < newest.id ? oldest.code : newest.code },
  });
  expect(
    await prisma.lobbyMember.findMany({
      where: { lobbyId: { in: roomIds } },
      orderBy: { id: "asc" },
    }),
  ).toEqual(before);
  const closest = await room("closest", 2);
  expect(await service.findQuickLobby()).toMatchObject({
    ok: true,
    value: { code: closest.code },
  });
});
it("excludes bans, expired hosts, full rooms, hidden rooms and non-joinable states; returns null after expiry", async () => {
  const banned = await room("banned", 2);
  const target = await actor();
  await service.joinLobby(banned.code, "SPECTATOR", target);
  expect(
    (await service.kickLobby(banned.code, target.playerIdentityId, banned.host))
      .ok,
  ).toBe(true);
  const full = await room("full", 2);
  await service.joinLobby(full.code, "PARTICIPANT", await actor());
  await room("hidden", 2, "PARTICIPANT", "CODE");
  const expired = await room("expired", 2);
  await prisma.lobbyMember.updateMany({
    where: { lobbyId: expired.id },
    data: { lastSeenAt: new Date(now - 30_001) },
  });
  for (const state of ["COUNTDOWN", "RACING", "CLOSED"] as const) {
    const excluded = await room(state, 2);
    await prisma.lobby.update({ where: { id: excluded.id }, data: { state } });
  }
  const eligible = await room("results", 3);
  await prisma.lobby.update({
    where: { id: eligible.id },
    data: { state: "RESULTS" },
  });
  expect(await service.findQuickLobby(target.playerIdentityId)).toMatchObject({
    ok: true,
    value: { code: eligible.code },
  });
  now += 30_001;
  expect(await service.findQuickLobby()).toEqual({ ok: true, value: null });
});
it("revalidates capacity transactionally when two people try the selected last slot", async () => {
  const selected = await room("last slot", 2);
  const [first, second] = await Promise.all([actor(), actor()]);
  expect(await service.findQuickLobby()).toMatchObject({
    ok: true,
    value: { code: selected.code },
  });
  const results = await Promise.all([
    service.joinLobby(selected.code, "PARTICIPANT", first),
    service.joinLobby(selected.code, "PARTICIPANT", second),
  ]);
  expect(results.filter((result) => result.ok)).toHaveLength(1);
  expect(results.filter((result) => !result.ok)).toEqual([
    { ok: false, error: { code: "ROOM_FULL", messageKey: "errors.ROOM_FULL" } },
  ]);
  expect(await service.findQuickLobby()).toEqual({ ok: true, value: null });
});
it("finds the best room beyond 100 candidates in PostgreSQL", async () => {
  for (let i = 0; i < 101; i++)
    await room(`candidate-${i}`, i === 100 ? 2 : 30);
  const byId = await prisma.lobby.findMany({
    where: { id: { in: roomIds } },
    orderBy: { id: "asc" },
  });
  await prisma.lobby.updateMany({
    where: { id: { in: roomIds } },
    data: { capacity: 30 },
  });
  const winner = byId[100];
  await prisma.lobby.update({
    where: { id: winner.id },
    data: { capacity: 2 },
  });
  expect(await service.findQuickLobby()).toMatchObject({
    ok: true,
    value: { code: winner.code },
  });
});
