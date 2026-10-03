import { failure, success } from "@/shared/contracts/operation-result";
import type { AuthPrincipal } from "../../contracts/actor";
import type { PlayerIdentityRepository } from "../../repositories/interfaces/player-identity-repository";
import type { IdentitySupervisor } from "../interfaces/identity-supervisor";
export class DefaultIdentitySupervisor implements IdentitySupervisor {
  constructor(private readonly repository: PlayerIdentityRepository) {}
  async resolveActor(principal: AuthPrincipal | null) {
    if (!principal) return failure("UNAUTHENTICATED");
    const identity = await this.repository.ensureForAuthUser(
      principal.authUserId,
    );
    if (!identity.ok) return identity;
    return success({
      playerIdentityId: identity.value.id,
      kind: principal.kind,
      displayName: principal.displayName,
    });
  }
}
