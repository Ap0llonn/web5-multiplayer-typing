import { beforeEach, expect, it, vi } from "vitest";
import { getCurrentActor } from "@/modules/identity/server";
import { handleQuickLobby } from "@/composition/lobby/http";
import { failure, success } from "@/shared/contracts/operation-result";

vi.mock("@/modules/identity/server", () => ({ getCurrentActor: vi.fn() }));
const { findQuickLobby } = vi.hoisted(() => ({ findQuickLobby: vi.fn() }));
vi.mock("@/modules/lobby/server", async () => ({
  ...(await import("@/modules/lobby/contracts/lobby-schemas")),
  getLobbyService: () => ({ findQuickLobby }),
}));
const request = (query = "") =>
  new Request(`http://localhost:3000/api/lobbies/quick${query}`);
beforeEach(() => {
  vi.clearAllMocks();
  findQuickLobby.mockResolvedValue(success(null));
});
it("allows anonymous selection without creating a session and provides the guest empty state", async () => {
  vi.mocked(getCurrentActor).mockResolvedValue(failure("UNAUTHENTICATED"));
  const response = await handleQuickLobby(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(await response.json()).toEqual(
    success({ room: null, canCreate: false }),
  );
  expect(findQuickLobby).toHaveBeenCalledWith(undefined);
});
it("uses the real session identity and offers creation only to accounts", async () => {
  for (const kind of ["account", "guest"] as const) {
    vi.mocked(getCurrentActor).mockResolvedValue(
      success({
        playerIdentityId: "real",
        kind,
        displayName: "Real",
        authUserId: "user",
      }),
    );
    expect(await (await handleQuickLobby(request())).json()).toEqual(
      success({ room: null, canCreate: kind === "account" }),
    );
    expect(findQuickLobby).toHaveBeenLastCalledWith("real");
  }
});
it("rejects query spoofing and propagates identity/repository failures without false empty results", async () => {
  expect(
    (await handleQuickLobby(request("?playerIdentityId=forged"))).status,
  ).toBe(400);
  expect(getCurrentActor).not.toHaveBeenCalled();
  vi.mocked(getCurrentActor).mockResolvedValue(failure("INTERNAL"));
  expect((await handleQuickLobby(request())).status).toBe(500);
  expect(findQuickLobby).not.toHaveBeenCalled();
  vi.mocked(getCurrentActor).mockResolvedValue(failure("UNAUTHENTICATED"));
  findQuickLobby.mockResolvedValue(failure("INTERNAL"));
  expect(await (await handleQuickLobby(request())).json()).toEqual(
    failure("INTERNAL"),
  );
});
