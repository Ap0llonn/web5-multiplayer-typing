import type { OperationResult } from "@/shared/contracts/operation-result";
import type { Lobby } from "../../contracts/lobby";
export type QuickLobbyCandidate = { room: Lobby; createdAt: number };
export const QUICK_LOBBY_PAGE_SIZE = 100;
export interface LobbyRepository {
  findQuickLobbyCandidates(
    activeSince: number,
    afterId?: string,
  ): Promise<OperationResult<QuickLobbyCandidate[]>>;
  findPublicLobbies(activeSince: number): Promise<OperationResult<Lobby[]>>;
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
