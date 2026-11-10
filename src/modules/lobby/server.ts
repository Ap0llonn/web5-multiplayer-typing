import "server-only";
import { lobbySupervisor, raceSupervisor } from "./container";
export const getRaceService = () => raceSupervisor;
export {
  raceSettingsSchema,
  raceEditSchema,
  raceUseItemSchema,
  emptyRaceCommandSchema,
} from "./contracts/race-schemas";
export const getLobbyService = () => lobbySupervisor;
export {
  createLobbySchema,
  publicLobbiesQuerySchema,
  heartbeatLobbySchema,
  kickLobbySchema,
  joinLobbySchema,
  roomCodeSchema,
} from "./contracts/lobby-schemas";

export { readProfileMetrics } from "./repositories/implementations/profile-metrics";
export { readRaceArchive } from "./repositories/implementations/race-archive";
