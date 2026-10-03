import { it, expect, vi, afterEach } from "vitest";
import { lobbyEvents } from "@/composition/lobby/events";
import { getRoomSnapshot } from "@/composition/lobby/http";
import { success, failure } from "@/shared/contracts/operation-result";
import type { LobbySnapshot } from "@/modules/lobby/public";
vi.mock("@/composition/lobby/http", () => ({ getRoomSnapshot: vi.fn() }));
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});
it("keeps the SSE stream open through retryable contention, then stops on revoked authorization", async () => {
  vi.useFakeTimers();
  const room: LobbySnapshot = {
    id: "room",
    code: "ABC234",
    name: "Room",
    capacity: 2,
    hostPlayerIdentityId: "host",
    state: "WAITING",
    version: 1,
    members: [],
  };
  vi.mocked(getRoomSnapshot)
    .mockResolvedValueOnce(success(room))
    .mockResolvedValueOnce(failure("CONFLICT"))
    .mockResolvedValueOnce(success(room))
    .mockResolvedValueOnce(failure("UNAUTHENTICATED"));
  const response = await lobbyEvents(
    new Request("http://localhost:3000/api/lobbies/ABC234/events"),
    "ABC234",
  );
  const reader = response.body!.getReader();
  const text = async () =>
    new TextDecoder().decode((await reader.read()).value);
  expect(await text()).toContain("event: snapshot");
  await vi.advanceTimersByTimeAsync(1000);
  expect(await text()).toContain("event: transient-error");
  await vi.advanceTimersByTimeAsync(1000);
  expect(await text()).toContain("event: snapshot");
  await vi.advanceTimersByTimeAsync(1000);
  expect(await text()).toContain("UNAUTHENTICATED");
  expect((await reader.read()).done).toBe(true);
});
it("retries a transient failure during initial stream setup instead of returning a terminal HTTP error", async () => {
  vi.useFakeTimers();
  const room: LobbySnapshot = {
    id: "room",
    code: "ABC234",
    name: "Room",
    capacity: 2,
    hostPlayerIdentityId: "host",
    state: "WAITING",
    version: 1,
    members: [],
  };
  vi.mocked(getRoomSnapshot)
    .mockResolvedValueOnce(failure("CONFLICT"))
    .mockResolvedValueOnce(success(room));
  const response = await lobbyEvents(
    new Request("http://localhost:3000/api/lobbies/ABC234/events"),
    "ABC234",
  );
  expect(response.status).toBe(200);
  const reader = response.body!.getReader();
  expect(new TextDecoder().decode((await reader.read()).value)).toContain(
    "transient-error",
  );
  await vi.advanceTimersByTimeAsync(1000);
  expect(new TextDecoder().decode((await reader.read()).value)).toContain(
    "event: snapshot",
  );
  await reader.cancel();
});
