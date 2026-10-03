import { it, expect } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { DefaultLobbySupervisor } from "@/modules/lobby/supervisors/implementations/default-lobby-supervisor";
import { PrismaLobbyRepository } from "@/modules/lobby/repositories/implementations/prisma-lobby-repository";
import type { LobbyActor } from "@/modules/lobby/public";
it("keeps all 30 memberships through four synchronized heartbeat bursts", async () => {
  let now = 0;
  const service = new DefaultLobbySupervisor(
    new PrismaLobbyRepository(prisma),
    () => now,
  );
  const actors: LobbyActor[] = [];
  for (let n = 0; n < 30; n++) {
    const id = `presence-${n}`;
    await prisma.user.create({
      data: {
        id,
        name: id,
        email: `${id}@example.test`,
        playerIdentity: { create: { id: `p-${id}` } },
      },
    });
    actors.push({
      playerIdentityId: `p-${id}`,
      kind: "account",
      displayName: id,
    });
  }
  const created = await service.createLobby(
    { name: "Thirty", capacity: 30, role: "PARTICIPANT" },
    actors[0],
  );
  if (!created.ok) throw Error(created.error.code);
  for (const actor of actors.slice(1))
    expect(
      (await service.joinLobby(created.value.code, "PARTICIPANT", actor)).ok,
    ).toBe(true);
  for (let round = 0; round < 4; round++) {
    now += 1000;
    const results = await Promise.all(
      actors.map((a) => service.heartbeat(created.value.code, a)),
    );
    expect(results.filter((r) => !r.ok)).toEqual([]);
    expect(results.every((r) => r.ok && r.value.members.length === 30)).toBe(
      true,
    );
  }
  expect(
    await prisma.lobbyMember.count({
      where: {
        lobbyId: created.value.id,
        activePlayerIdentityId: { not: null },
      },
    }),
  ).toBe(30);
});
