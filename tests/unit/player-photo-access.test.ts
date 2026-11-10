import { beforeEach, expect, it, vi } from "vitest";
import { success } from "@/shared/contracts/operation-result";
import { handlePlayerPhoto } from "@/composition/profile/http";
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  photo: vi.fn(),
  current: vi.fn(),
  archive: vi.fn(),
}));
vi.mock("@/modules/identity/server", () => ({
  getCurrentActor: mocks.actor,
  getCurrentProfilePhoto: mocks.photo,
}));
vi.mock("@/modules/lobby/server", () => ({
  getLobbyService: () => ({ currentLobby: mocks.current }),
  readRaceArchive: mocks.archive,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.actor.mockResolvedValue(success({ playerIdentityId: "self" }));
  mocks.current.mockResolvedValue(
    success({ members: [{ playerIdentityId: "peer" }] }),
  );
  mocks.photo.mockResolvedValue(success(new Uint8Array([1])));
});
it("serves room peers privately and rejects unrelated identities", async () => {
  expect(
    (
      await handlePlayerPhoto(
        new Request("http://localhost/api/players/photo?player=peer"),
      )
    ).status,
  ).toBe(200);
  mocks.photo.mockClear();
  expect(
    (
      await handlePlayerPhoto(
        new Request("http://localhost/api/players/photo?player=stranger"),
      )
    ).status,
  ).toBe(404);
  expect(mocks.photo).not.toHaveBeenCalled();
});
it("requires a personally authorized archive to view former competitors", async () => {
  mocks.archive.mockResolvedValue(
    success({ players: [{ playerIdentityId: "former" }] }),
  );
  expect(
    (
      await handlePlayerPhoto(
        new Request(
          "http://localhost/api/players/photo?player=former&race=race",
        ),
      )
    ).status,
  ).toBe(200);
  expect(mocks.archive).toHaveBeenCalledWith("race", "self");
});
it("rejects unrecognized query input", async () => {
  expect(
    (
      await handlePlayerPhoto(
        new Request(
          "http://localhost/api/players/photo?player=peer&admin=true",
        ),
      )
    ).status,
  ).toBe(400);
  expect(mocks.photo).not.toHaveBeenCalled();
});
