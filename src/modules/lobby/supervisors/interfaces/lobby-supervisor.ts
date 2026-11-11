import type { CreatedInvitation } from "../../contracts/invitation";
import type { OperationResult } from "@/shared/contracts/operation-result";
import type {
  CreateLobbyInput,
  PublicLobbySummary,
  LobbyActor,
  LobbySnapshot,
  LobbyRole,
  LobbyCharacter,
} from "../../contracts/lobby";
export interface LobbySupervisor {
  createInvitation(
    code: string,
    actor: LobbyActor,
  ): Promise<OperationResult<CreatedInvitation>>;
  findQuickLobby(
    playerIdentityId?: string,
  ): Promise<OperationResult<PublicLobbySummary | null>>;
  listPublicLobbies(): Promise<OperationResult<PublicLobbySummary[]>>;
  createLobby(
    input: CreateLobbyInput,
    actor: LobbyActor,
  ): Promise<OperationResult<LobbySnapshot>>;
  joinLobby(
    code: string,
    role: LobbyRole,
    actor: LobbyActor,
    character?: LobbyCharacter,
    invitationToken?: string,
  ): Promise<OperationResult<LobbySnapshot>>;
  leaveLobby(
    code: string,
    actor: LobbyActor,
  ): Promise<OperationResult<LobbySnapshot>>;
  kickLobby(
    code: string,
    targetPlayerIdentityId: string,
    actor: LobbyActor,
  ): Promise<OperationResult<LobbySnapshot>>;
  observeLobby(
    code: string,
    actor: LobbyActor,
  ): Promise<OperationResult<LobbySnapshot>>;
  heartbeat(
    code: string,
    actor: LobbyActor,
  ): Promise<OperationResult<LobbySnapshot>>;
  currentLobby(
    actor: LobbyActor,
  ): Promise<OperationResult<LobbySnapshot | null>>;
}
