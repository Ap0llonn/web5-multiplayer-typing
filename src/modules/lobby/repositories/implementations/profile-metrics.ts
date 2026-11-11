import "server-only";
import { keyStatisticsSchema } from "../../contracts/key-statistics";
import { mergeKeyStatistics } from "../../domain/key-statistics";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { failure, success } from "@/shared/contracts/operation-result";

export async function readProfileMetrics(playerIdentityId: string) {
  try {
    const result = await prisma.raceResult.aggregate({
      where: { playerIdentityId },
      _count: true,
      _max: { wpm: true },
      _avg: { wpm: true, accuracy: true },
    });
    const [wins, unknownRanks, history] = await Promise.all([
      prisma.raceResult.count({
        where: { playerIdentityId, rank: 1, status: "FINISHED" },
      }),
      prisma.raceResult.count({ where: { playerIdentityId, rank: null } }),
      prisma.raceResult.findMany({
        where: { playerIdentityId },
        orderBy: [{ finishedAt: "desc" }, { raceId: "desc" }],
        take: 100,
        select: {
          raceId: true,
          finishedAt: true,
          rank: true,
          status: true,
          wpm: true,
          grossWpm: true,
          accuracy: true,
          errors: true,
          elapsedMs: true,
        },
      }),
    ]);
    const keyRows = await prisma.raceResult.findMany({
      where: { playerIdentityId },
      select: { keyStatistics: true },
    });
    const groups = [];
    for (const row of keyRows) {
      if (row.keyStatistics === null) continue;
      const parsed = keyStatisticsSchema.safeParse(row.keyStatistics);
      if (!parsed.success) return failure("INTERNAL");
      groups.push(parsed.data);
    }
    return success({
      keyStatistics: mergeKeyStatistics(groups),
      heatmapRaces: groups.length,
      wins,
      unknownRanks,
      history: history.map((row) => ({
        ...row,
        finishedAt: row.finishedAt.getTime(),
      })),
      races: result._count,
      bestWpm: result._max.wpm ?? 0,
      averageWpm: result._avg.wpm ?? 0,
      accuracy: result._avg.accuracy ?? 0,
    });
  } catch {
    return failure("INTERNAL");
  }
}
