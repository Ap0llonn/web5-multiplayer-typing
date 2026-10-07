import type { OperationResult } from "@/shared/contracts/operation-result";
import type { AuthPrincipal } from "../../contracts/actor";
import type { Profile, ProfileUpdateInput } from "../../contracts/profile";

export interface ProfileSupervisor {
  currentProfile(
    principal: AuthPrincipal | null,
  ): Promise<OperationResult<Profile>>;
  updateProfile(
    principal: AuthPrincipal | null,
    input: ProfileUpdateInput,
  ): Promise<OperationResult<Profile>>;
  currentPhoto(
    principal: AuthPrincipal | null,
  ): Promise<OperationResult<Uint8Array>>;
}
