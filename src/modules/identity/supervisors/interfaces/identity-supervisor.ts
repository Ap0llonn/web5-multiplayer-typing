import type { OperationResult } from "@/shared/contracts/operation-result";
import type { Actor, AuthPrincipal } from "../../contracts/actor";
export interface IdentitySupervisor {
  resolveActor(
    principal: AuthPrincipal | null,
  ): Promise<OperationResult<Actor>>;
}
