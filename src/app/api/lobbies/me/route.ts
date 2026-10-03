import { handleLobbyCommand } from "@/composition/lobby/http";
export const GET = (request: Request) => handleLobbyCommand(request, "current");
