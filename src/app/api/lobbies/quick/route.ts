import { handleQuickLobby } from "@/composition/lobby/http";

export const GET = (request: Request) => handleQuickLobby(request);
