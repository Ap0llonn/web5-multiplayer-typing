import {
  failure,
  type OperationResult,
} from "@/shared/contracts/operation-result";
import type { PublicLobbySummary } from "../../public";

export const PUBLIC_LOBBIES_REFRESH_MS = 5_000;
const REQUEST_TIMEOUT_MS = 4_000;

export function pollPublicLobbies(
  onResult: (result: OperationResult<PublicLobbySummary[]>) => void,
) {
  let stopped = false;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout>;
  async function refresh() {
    if (stopped || controller) return;
    clearTimeout(timer);
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS);
    let result: OperationResult<PublicLobbySummary[]>;
    try {
      const response = await fetch("/api/lobbies", {
        cache: "no-store",
        signal: controller.signal,
      });
      result = await response.json();
      if (!response.ok && result.ok) result = failure("INTERNAL");
    } catch {
      result = failure("INTERNAL");
    } finally {
      clearTimeout(timeout);
      controller = undefined;
    }
    if (stopped) return;
    onResult(result);
    timer = setTimeout(() => void refresh(), PUBLIC_LOBBIES_REFRESH_MS);
  }
  timer = setTimeout(() => void refresh(), PUBLIC_LOBBIES_REFRESH_MS);
  return {
    refresh,
    stop() {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    },
  };
}
