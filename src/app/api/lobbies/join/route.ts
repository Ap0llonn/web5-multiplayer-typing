import { handleLobbyCommand } from "@/composition/lobby/http";
export const POST = (request: Request) => handleLobbyCommand(request, "join");
