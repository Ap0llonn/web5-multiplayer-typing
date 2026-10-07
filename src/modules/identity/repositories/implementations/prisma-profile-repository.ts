import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { failure, success } from "@/shared/contracts/operation-result";
import type { ProfileUpdateInput } from "../../contracts/profile";
import type { ProfileRepository } from "../interfaces/profile-repository";

const selection = {
  name: true,
  username: true,
  createdAt: true,
  profilePhoto: { select: { updatedAt: true } },
} as const;
function toProfile(user: {
  name: string;
  username: string | null;
  createdAt: Date;
  profilePhoto: { updatedAt: Date } | null;
}) {
  return {
    displayName: user.name,
    username: user.username,
    joinedAt: user.createdAt.getTime(),
    photoVersion: user.profilePhoto?.updatedAt.getTime() ?? null,
  };
}

export class PrismaProfileRepository implements ProfileRepository {
  constructor(private readonly db: PrismaClient) {}

  async read(authUserId: string) {
    try {
      const user = await this.db.user.findFirst({
        where: { id: authUserId, isAnonymous: false },
        select: selection,
      });
      return user ? success(toProfile(user)) : failure("NOT_FOUND");
    } catch {
      return failure("INTERNAL");
    }
  }

  async update(authUserId: string, input: ProfileUpdateInput) {
    try {
      const user = await this.db.user.update({
        where: { id: authUserId, isAnonymous: false },
        data: {
          name: input.displayName,
          ...(input.photo
            ? {
                profilePhoto: {
                  upsert: {
                    create: { data: new Uint8Array(input.photo) },
                    update: { data: new Uint8Array(input.photo) },
                  },
                },
              }
            : {}),
        },
        select: selection,
      });
      return success(toProfile(user));
    } catch {
      return failure("INTERNAL");
    }
  }

  async readPhoto(authUserId: string) {
    try {
      const photo = await this.db.profilePhoto.findFirst({
        where: { authUserId, user: { isAnonymous: false } },
        select: { data: true },
      });
      return photo ? success(photo.data) : failure("NOT_FOUND");
    } catch {
      return failure("INTERNAL");
    }
  }
}
