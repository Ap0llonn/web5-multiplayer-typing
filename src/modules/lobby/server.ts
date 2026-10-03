import "server-only";
import { lobbySupervisor } from "./container";
export const getLobbyService = () => lobbySupervisor;
export {
  createLobbySchema,
  heartbeatLobbySchema,
  joinLobbySchema,
  roomCodeSchema,
} from "./contracts/lobby-schemas";
