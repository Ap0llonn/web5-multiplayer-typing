import "server-only";
import { getRoomSnapshot } from "./http";
import { resultResponse } from "@/shared/infrastructure/http/response";
export async function lobbyEvents(request: Request, code: string) {
  const first = await getRoomSnapshot(request.headers, code);
  if (!first.ok) return resultResponse(first);
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
      const send = (value: Awaited<ReturnType<typeof getRoomSnapshot>>) => {
        if (!stopped)
          controller.enqueue(
            encoder.encode(
              `event: snapshot\ndata: ${JSON.stringify(value)}\n\n`,
            ),
          );
      };
      send(first);
      const tick = async () => {
        try {
          const result = await getRoomSnapshot(request.headers, code);
          if (stopped) return;
          send(result);
          if (!result.ok) {
            close();
            return;
          }
          timer = setTimeout(tick, 1000);
        } catch {
          close();
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
