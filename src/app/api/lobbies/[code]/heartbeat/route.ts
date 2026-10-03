import { handleLobbyCommand } from "@/composition/lobby/http";
export const POST = async (
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) => handleLobbyCommand(request, "heartbeat", (await params).code);
