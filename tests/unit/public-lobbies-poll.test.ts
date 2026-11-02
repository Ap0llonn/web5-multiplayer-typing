import { afterEach, expect, it, vi } from "vitest";
import { pollPublicLobbies } from "@/modules/lobby/presentation/transport/public-lobbies-poll";
import { failure, success } from "@/shared/contracts/operation-result";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("refreshes without navigation, reports failures and recovers on the next poll", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValue({ ok: true, json: async () => success([]) });
  vi.stubGlobal("fetch", fetcher);
  const receive = vi.fn();
  const poll = pollPublicLobbies(receive);
  expect(fetcher).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(5000);
  expect(receive).toHaveBeenLastCalledWith(failure("INTERNAL"));
  await vi.advanceTimersByTimeAsync(5000);
  expect(receive).toHaveBeenLastCalledWith(success([]));
  expect(fetcher).toHaveBeenCalledWith(
    "/api/lobbies",
    expect.objectContaining({ cache: "no-store" }),
  );
  poll.stop();
  await vi.advanceTimersByTimeAsync(10000);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("prevents overlapping requests, aborts on exit and ignores late responses", async () => {
  vi.useFakeTimers();
  let complete: (response: Response) => void = () => {};
  const fetcher = vi.fn().mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        complete = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  const receive = vi.fn();
  const poll = pollPublicLobbies(receive);
  const pending = poll.refresh();
  void poll.refresh();
  expect(fetcher).toHaveBeenCalledTimes(1);
  const signal: AbortSignal = fetcher.mock.calls[0][1].signal;
  poll.stop();
  expect(signal.aborted).toBe(true);
  complete(Response.json(success([])));
  await pending;
  expect(receive).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
