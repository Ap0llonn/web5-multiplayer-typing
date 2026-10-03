import type { OperationResult } from "@/shared/contracts/operation-result";
import type { Lobby } from "../../contracts/lobby";
export interface LobbyRepository {
  create(room: Lobby): Promise<OperationResult<Lobby>>;
  mutate(
    code: string,
    change: (room: Lobby) => OperationResult<Lobby>,
  ): Promise<OperationResult<Lobby>>;
  refreshPresence(
    code: string,
    playerIdentityId: string,
    now: number,
    activeSince: number,
  ): Promise<OperationResult<Lobby>>;
  findForPlayer(
    playerIdentityId: string,
  ): Promise<OperationResult<Lobby | null>>;
}
