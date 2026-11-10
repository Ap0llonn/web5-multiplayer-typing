import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { success, failure } from "@/shared/contracts/operation-result";
import type { PlayerIdentityRepository } from "../interfaces/player-identity-repository";
export class PrismaPlayerIdentityRepository implements PlayerIdentityRepository {
  constructor(private readonly db: PrismaClient) {}
  async linkGuestSignup(guestUserId: string, accountUserId: string) {
    try {
      return await this.db.$transaction(async (tx) => {
        const guest = await tx.user.findUnique({ where: { id: guestUserId } });
        const account = await tx.user.findUnique({
          where: { id: accountUserId },
        });
        if (!guest?.isAnonymous || !account || account.isAnonymous)
          return failure("FORBIDDEN");
        const source = await tx.playerIdentity.findUnique({
          where: { authUserId: guestUserId },
        });
        if (!source) return success(undefined);
        await tx.playerIdentity.update({
          where: { id: source.id },
          data: { authUserId: accountUserId },
        });
        return success(undefined);
      });
    } catch {
      return failure("INTERNAL");
    }
  }
  async ensureForAuthUser(authUserId: string) {
    try {
      const identity = await this.db.playerIdentity.upsert({
        where: { authUserId },
        create: { authUserId },
        update: {},
        select: { id: true },
      });
      return success(identity);
    } catch (error) {
      // Prisma may implement an empty-update upsert as read-then-insert.
      // A concurrent caller can win the unique authUserId insertion; converge
      // on that committed identity instead of turning the race into a failure.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        try {
          const winner = await this.db.playerIdentity.findUnique({
            where: { authUserId },
            select: { id: true },
          });
          if (winner) return success(winner);
        } catch {
          return failure("INTERNAL");
        }
      }
      return failure("INTERNAL");
    }
  }
}
