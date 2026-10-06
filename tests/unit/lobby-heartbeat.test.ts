import { afterEach, expect, it, vi } from "vitest";
import { startLobbyHeartbeat } from "@/modules/lobby/presentation/transport/lobby-heartbeat";
import {
  success,
  failure,
  type OperationResult,
} from "@/shared/contracts/operation-result";
import type { LobbySnapshot } from "@/modules/lobby/public";
const room: LobbySnapshot = {
  id: "room",
  code: "ABC234",
  name: "Room",
  capacity: 2,
  state: "WAITING",
  version: 1,
  hostPlayerIdentityId: "host",
  members: [],
};
afterEach(() => vi.useRealTimers());
it("sends an immediate authenticated same-origin heartbeat, retries failure and stops cleanly", async () => {
  vi.useFakeTimers();
  const requests: Array<{ path: string; init?: RequestInit }> = [];
  const results: OperationResult<LobbySnapshot>[] = [];
  const stop = startLobbyHeartbeat(
    room.code,
    (result) => results.push(result),
    async (path, init) => {
      requests.push({ path, init });
      if (requests.length === 1) throw new Error("Offline");
      return Response.json(success(room));
    },
  );
  await vi.advanceTimersByTimeAsync(0);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    path: "/api/lobbies/ABC234/heartbeat",
    init: {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    },
  });
  expect(results).toEqual([failure("INTERNAL")]);
  await vi.advanceTimersByTimeAsync(5000);
  expect(results).toEqual([failure("INTERNAL"), success(room)]);
  stop();
  await vi.advanceTimersByTimeAsync(10000);
  expect(requests).toHaveLength(2);
});
it("bounds a pending request and never overlaps requests or applies a response after stop", async () => {
  vi.useFakeTimers();
  let resolve!: (response: Response) => void;
  let signal: AbortSignal | undefined;
  let count = 0;
  const results: OperationResult<LobbySnapshot>[] = [];
  const stop = startLobbyHeartbeat(
    room.code,
    (result) => results.push(result),
    async (_path, init) => {
      count++;
      signal = init?.signal ?? undefined;
      return new Promise<Response>((r) => {
        resolve = r;
      });
    },
  );
  await vi.advanceTimersByTimeAsync(4000);
  expect(signal?.aborted).toBe(true);
  await vi.advanceTimersByTimeAsync(10000);
  expect(count).toBe(1);
  stop();
  resolve(Response.json(success(room)));
  await vi.advanceTimersByTimeAsync(10000);
  expect(results).toEqual([]);
  expect(count).toBe(1);
});
