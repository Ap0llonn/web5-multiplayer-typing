import type { OperationResult } from "@/shared/contracts/operation-result";
import type {
  CreateLobbyInput,
  LobbyActor,
  LobbySnapshot,
  LobbyRole,
  LobbyCharacter,
} from "../../contracts/lobby";
export interface LobbySupervisor {
  createLobby(
    input: CreateLobbyInput,
    actor: LobbyActor,
  ): Promise<OperationResult<LobbySnapshot>>;
  joinLobby(
    code: string,
    role: LobbyRole,
    actor: LobbyActor,
    character?: LobbyCharacter,
  ): Promise<OperationResult<LobbySnapshot>>;
  leaveLobby(
    code: string,
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
