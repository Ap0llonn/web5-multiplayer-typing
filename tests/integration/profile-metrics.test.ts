import { afterAll, expect, it } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { readProfileMetrics } from "@/modules/lobby/server";

afterAll(() => prisma.$disconnect());
it("isolates account metrics and counts only finished first places as wins", async () => {
  const id = crypto.randomUUID();
  await prisma.user.create({
    data: {
      id,
      name: "Metrics",
      email: `${id}@example.test`,
      playerIdentity: { create: { id } },
    },
  });
  try {
    for (const [index, wpm, rank, status] of [
      [0, 40, 1, "FINISHED"],
      [1, 60, 2, "FINISHED"],
      [2, 0, 1, "TIMEOUT"],
      [3, 20, null, "FINISHED"],
    ] as const) {
      await prisma.raceResult.create({
        data: {
          playerIdentityId: id,
          raceId: `${id}-${index}`,
          finishedAt: new Date(index * 1000),
          wpm,
          grossWpm: wpm,
          accuracy: 90,
          errors: 1,
          elapsedMs: 1000,
          samples: [],
          rank,
          status,
        },
      });
    }
    expect(await readProfileMetrics(id)).toMatchObject({
      ok: true,
      value: {
        races: 4,
        bestWpm: 60,
        averageWpm: 30,
        accuracy: 90,
        wins: 1,
        unknownRanks: 1,
        history: expect.arrayContaining([
          expect.objectContaining({ raceId: `${id}-3`, rank: null }),
        ]),
      },
    });
    const other = await readProfileMetrics(crypto.randomUUID());
    expect(other).toMatchObject({
      ok: true,
      value: { races: 0, wins: 0, history: [] },
    });
  } finally {
    await prisma.playerIdentity.delete({ where: { id } });
    await prisma.user.delete({ where: { id } });
  }
});
