import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { failure, success } from "@/shared/contracts/operation-result";
import type { RaceTextRepository } from "../interfaces/race-text-repository";
export class PrismaRaceTextRepository implements RaceTextRepository {
  constructor(private readonly db: PrismaClient) {}
  async findCorpus(language: "fr" | "en") {
    try {
      return success(
        await this.db.practiceText.findMany({
          where: { language, id: { startsWith: "corpus-" } },
          select: { content: true, source: true },
          orderBy: { id: "asc" },
        }),
      );
    } catch {
      return failure("INTERNAL");
    }
  }
  async findDictionary(language: "fr" | "en") {
    try {
      const words = await this.db.practiceWord.findMany({
        where: { language },
        orderBy: { word: "asc" },
        select: { word: true },
      });
      return success(words.map((w) => w.word));
    } catch {
      return failure("INTERNAL");
    }
  }
}
