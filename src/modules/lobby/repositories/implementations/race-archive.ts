import "server-only";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { failure, success } from "@/shared/contracts/operation-result";
import {
  raceArchiveIdSchema,
  raceArchiveSchema,
} from "../../contracts/race-archive";
export async function readRaceArchive(
  raceId: string,
  playerIdentityId: string,
) {
  if (!raceArchiveIdSchema.safeParse(raceId).success)
    return failure("VALIDATION");
  try {
    const result = await prisma.raceResult.findUnique({
      where: { raceId_playerIdentityId: { raceId, playerIdentityId } },
      select: { raceId: true },
    });
    if (!result) return failure("NOT_FOUND");
    const archive = await prisma.raceArchive.findUnique({
      where: { id: raceId },
    });
    if (!archive) return failure("NOT_FOUND");
    const parsed = raceArchiveSchema.safeParse(archive.results);
    return parsed.success ? success(parsed.data) : failure("INTERNAL");
  } catch {
    return failure("INTERNAL");
  }
}
