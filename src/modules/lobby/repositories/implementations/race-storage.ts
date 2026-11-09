import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { RaceState } from "../../contracts/race";
import { raceMetrics } from "../../domain/race-rules";

export function raceData(race: RaceState) {
  return {
    ...race,
    settings: { ...race.settings },
    players: race.players.map((p) => ({
      ...p,
      samples: p.samples.map((s) => ({ ...s })),
    })),
  };
}
export async function saveRaceResults(
  tx: Prisma.TransactionClient,
  race: RaceState,
) {
  if (race.endedAt === null) return;
  // Only account results become history. Guest data stays in the current room aggregate.
  for (const player of race.players.filter((p) => p.kind === "account")) {
    const elapsedMs = Math.max(
      0,
      (player.finishedAt ?? race.endedAt) - race.startsAt,
    );
    await tx.raceResult.upsert({
      where: {
        raceId_playerIdentityId: {
          raceId: race.id,
          playerIdentityId: player.playerIdentityId,
        },
      },
      create: {
        raceId: race.id,
        playerIdentityId: player.playerIdentityId,
        finishedAt: new Date(race.endedAt),
        status: player.status,
        ...raceMetrics(player, elapsedMs),
        errors: player.errors,
        elapsedMs,
        bonusesReceived: player.bonusesReceived,
        samples: player.samples.map((s) => ({ ...s })),
      },
      update: {},
    });
  }
}
