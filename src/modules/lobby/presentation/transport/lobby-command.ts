import {
  failure,
  type OperationResult,
} from "@/shared/contracts/operation-result";
import type { LobbySnapshot } from "../../public";
type BrowserRequest = (path: string, init?: RequestInit) => Promise<Response>;
type LobbyCommandFeedback = {
  result: OperationResult<LobbySnapshot>;
  currentRoom?: LobbySnapshot;
};
export async function sendLobbyCommand(
  path: string,
  body: unknown,
  request: BrowserRequest = fetch,
): Promise<LobbyCommandFeedback> {
  try {
    const response = await request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result: OperationResult<LobbySnapshot> = await response.json();
    if (
      !result.ok &&
      result.error.code === "CONFLICT" &&
      !path.endsWith("/leave")
    ) {
      // Another tab may have acquired a room after this tab's initial lookup.
      // Read the authority, but never leave it or retry the requested join here.
      try {
        const current: OperationResult<LobbySnapshot | null> = await (
          await request("/api/lobbies/me")
        ).json();
        if (current.ok && current.value)
          return { result, currentRoom: current.value };
      } catch {
        // Keep the original refusal if the recovery read is unavailable.
      }
    }
    return { result };
  } catch {
    return { result: failure("INTERNAL") };
  }
}
