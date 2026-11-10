import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { RaceState } from "../../contracts/race";
import {
  rankedRacePlayers,
  raceMetrics,
  raceStandings,
} from "../../domain/race-rules";

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
  await tx.raceArchive.upsert({
    where: { id: race.id },
    create: {
      id: race.id,
      results: {
        players: raceStandings(race, race.endedAt).map((player) => ({
          ...player,
          samples:
            race.players
              .find((p) => p.playerIdentityId === player.playerIdentityId)
              ?.samples.map((sample) => ({ ...sample })) ?? [],
        })),
      },
    },
    update: {},
  });
  const rankings = rankedRacePlayers(race);
  // Human results survive room resets, including guests who later register.
  for (const player of race.players.filter((p) => p.kind !== "bot")) {
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
        rank:
          rankings.findIndex(
            (p) => p.playerIdentityId === player.playerIdentityId,
          ) + 1,
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
