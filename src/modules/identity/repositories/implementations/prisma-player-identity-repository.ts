import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { success, failure } from "@/shared/contracts/operation-result";
import type { PlayerIdentityRepository } from "../interfaces/player-identity-repository";
export class PrismaPlayerIdentityRepository implements PlayerIdentityRepository {
  constructor(private readonly db: PrismaClient) {}
  async ensureForAuthUser(authUserId: string) {
    try {
      const identity = await this.db.playerIdentity.upsert({
        where: { authUserId },
        create: { authUserId },
        update: {},
        select: { id: true },
      });
      return success(identity);
    } catch {
      return failure("INTERNAL");
    }
  }
}
