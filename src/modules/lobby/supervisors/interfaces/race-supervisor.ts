import type { OperationResult } from "@/shared/contracts/operation-result";
import type { LobbyActor, LobbySnapshot } from "../../contracts/lobby";
import type {
  RaceSettings,
  RaceEditInput,
  RaceUseItemInput,
} from "../../contracts/race";
export interface RaceSupervisor {
  useItem(
    code: string,
    actor: LobbyActor,
    input: RaceUseItemInput,
  ): Promise<OperationResult<LobbySnapshot>>;
  configure(
    code: string,
    actor: LobbyActor,
    settings: RaceSettings,
  ): Promise<OperationResult<LobbySnapshot>>;
  start(
    code: string,
    actor: LobbyActor,
  ): Promise<OperationResult<LobbySnapshot>>;
  edit(
    code: string,
    actor: LobbyActor,
    edits: RaceEditInput,
  ): Promise<OperationResult<LobbySnapshot>>;
  abandon(
    code: string,
    actor: LobbyActor,
  ): Promise<OperationResult<LobbySnapshot>>;
  reset(
    code: string,
    actor: LobbyActor,
    close: boolean,
  ): Promise<OperationResult<LobbySnapshot>>;
}
