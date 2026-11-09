import { handleRaceCommand } from "@/composition/lobby/race-http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; command: string }> },
) {
  const { code, command } = await params;
  return handleRaceCommand(request, code, command);
}
