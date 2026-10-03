import "server-only";
import { getRoomSnapshot } from "./http";
import { resultResponse } from "@/shared/infrastructure/http/response";
const isRetryable = (result: Awaited<ReturnType<typeof getRoomSnapshot>>) =>
  !result.ok &&
  ["CONFLICT", "INTERNAL", "RATE_LIMITED", "PROVIDER_UNAVAILABLE"].includes(
    result.error.code,
  );
export async function lobbyEvents(request: Request, code: string) {
  const first = await getRoomSnapshot(request.headers, code);
  if (!first.ok && !isRetryable(first)) return resultResponse(first);
  const encoder = new TextEncoder();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const close = () => {
        if (stopped) return;
        stopped = true;
        clearTimeout(timer);
        controller.close();
      };
      request.signal.addEventListener("abort", close, { once: true });
      const send = (
        value: Awaited<ReturnType<typeof getRoomSnapshot>>,
        event = "snapshot",
      ) => {
        if (!stopped)
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(value)}\n\n`,
            ),
          );
      };
      send(first, isRetryable(first) ? "transient-error" : "snapshot");
      const tick = async () => {
        try {
          const result = await getRoomSnapshot(request.headers, code);
          if (stopped) return;
          const retryable = isRetryable(result);
          send(result, retryable ? "transient-error" : "snapshot");
          if (!result.ok && !retryable) {
            close();
            return;
          }
          timer = setTimeout(tick, 1000);
        } catch {
          if (!stopped) timer = setTimeout(tick, 1000);
        }
      };
      timer = setTimeout(tick, 1000);
    },
    cancel() {
      stopped = true;
      clearTimeout(timer);
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-store",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
