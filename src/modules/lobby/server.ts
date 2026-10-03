import "server-only";
import { lobbySupervisor } from "./container";
export const getLobbyService = () => lobbySupervisor;
export {
  createLobbySchema,
  joinLobbySchema,
  roomCodeSchema,
} from "./contracts/lobby-schemas";
