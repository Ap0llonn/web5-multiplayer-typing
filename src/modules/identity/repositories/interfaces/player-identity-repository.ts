import type { OperationResult } from "@/shared/contracts/operation-result";
export interface PlayerIdentityRepository {
  ensureForAuthUser(
    authUserId: string,
  ): Promise<OperationResult<{ id: string }>>;
}
