import {
  handleLobbyCommand,
  handlePublicLobbies,
} from "@/composition/lobby/http";
export const POST = (request: Request) => handleLobbyCommand(request, "create");
export const GET = (request: Request) => handlePublicLobbies(request);
