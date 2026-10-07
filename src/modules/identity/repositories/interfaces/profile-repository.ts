import type { OperationResult } from "@/shared/contracts/operation-result";
import type { Profile, ProfileUpdateInput } from "../../contracts/profile";

export interface ProfileRepository {
  read(authUserId: string): Promise<OperationResult<Profile>>;
  update(
    authUserId: string,
    input: ProfileUpdateInput,
  ): Promise<OperationResult<Profile>>;
  readPhoto(authUserId: string): Promise<OperationResult<Uint8Array>>;
}
