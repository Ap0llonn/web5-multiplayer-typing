import { lobbyEvents } from "@/composition/lobby/events";
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) => lobbyEvents(request, (await params).code);
