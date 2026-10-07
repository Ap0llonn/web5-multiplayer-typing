import { failure } from "@/shared/contracts/operation-result";
import type { AuthPrincipal } from "../../contracts/actor";
import {
  profileNameSchema,
  type ProfileUpdateInput,
} from "../../contracts/profile";
import type { ProfileRepository } from "../../repositories/interfaces/profile-repository";
import type { ProfileSupervisor } from "../interfaces/profile-supervisor";

export class DefaultProfileSupervisor implements ProfileSupervisor {
  constructor(private readonly repository: ProfileRepository) {}

  async currentProfile(principal: AuthPrincipal | null) {
    if (!principal) return failure("UNAUTHENTICATED");
    if (principal.kind !== "account") return failure("FORBIDDEN");
    return this.repository.read(principal.authUserId);
  }

  async updateProfile(
    principal: AuthPrincipal | null,
    input: ProfileUpdateInput,
  ) {
    if (!principal) return failure("UNAUTHENTICATED");
    if (principal.kind !== "account") return failure("FORBIDDEN");
    const parsed = profileNameSchema.safeParse({
      displayName: input.displayName,
    });
    if (!parsed.success) return failure("VALIDATION");
    return this.repository.update(principal.authUserId, {
      ...parsed.data,
      ...(input.photo ? { photo: input.photo } : {}),
    });
  }

  async currentPhoto(principal: AuthPrincipal | null) {
    if (!principal) return failure("UNAUTHENTICATED");
    if (principal.kind !== "account") return failure("FORBIDDEN");
    return this.repository.readPhoto(principal.authUserId);
  }
}
