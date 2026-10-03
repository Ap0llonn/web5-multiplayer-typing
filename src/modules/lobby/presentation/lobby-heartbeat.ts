import {
  failure,
  type OperationResult,
} from "@/shared/contracts/operation-result";
import type { LobbySnapshot } from "../public";
import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
} from "../contracts/presence";
type BrowserRequest = (path: string, init?: RequestInit) => Promise<Response>;
export function startLobbyHeartbeat(
  code: string,
  onResult: (result: OperationResult<LobbySnapshot>) => void,
  request: BrowserRequest = fetch,
) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  async function beat() {
    const current = new AbortController();
    controller = current;
    const timeout = setTimeout(() => current.abort(), HEARTBEAT_TIMEOUT_MS);
    let result: OperationResult<LobbySnapshot> = failure("INTERNAL");
    try {
      const response = await request(`/api/lobbies/${code}/heartbeat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
        signal: current.signal,
      });
      result = await response.json();
      if (current.signal.aborted) result = failure("INTERNAL");
    } catch {
      /* Transient network errors retain membership and retry within the grace. */
    } finally {
      clearTimeout(timeout);
    }
    if (stopped) return;
    onResult(result);
    if (!stopped) timer = setTimeout(beat, HEARTBEAT_INTERVAL_MS);
  }
  void beat();
  return () => {
    stopped = true;
    clearTimeout(timer);
    controller?.abort();
  };
}
