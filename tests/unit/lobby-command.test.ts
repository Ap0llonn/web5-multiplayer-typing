import { expect, it } from "vitest";
import { sendLobbyCommand } from "@/modules/lobby/presentation/lobby-command";
import { failure, success } from "@/shared/contracts/operation-result";
import type { LobbySnapshot } from "@/modules/lobby/public";
const currentRoom: LobbySnapshot = {
  id: "current",
  code: "ABC234",
  name: "Current room",
  capacity: 2,
  state: "WAITING",
  version: 1,
  hostPlayerIdentityId: "host",
  members: [],
};
it.each(["/api/lobbies", "/api/lobbies/join"])(
  "recovers the current room after a stale-tab conflict at %s without changing membership",
  async (path) => {
    const requests: string[] = [];
    const feedback = await sendLobbyCommand(
      path,
      { code: "NEW234" },
      async (url, init) => {
        requests.push(`${init?.method ?? "GET"} ${url}`);
        return Response.json(
          url === "/api/lobbies/me"
            ? success(currentRoom)
            : failure("CONFLICT"),
        );
      },
    );
    expect(feedback).toEqual({ result: failure("CONFLICT"), currentRoom });
    expect(requests).toEqual([`POST ${path}`, "GET /api/lobbies/me"]);
  },
);
it("does not replace a full-room error or read unrelated membership", async () => {
  const requests: string[] = [];
  const feedback = await sendLobbyCommand(
    "/api/lobbies/join",
    {},
    async (url) => {
      requests.push(url);
      return Response.json(failure("ROOM_FULL"));
    },
  );
  expect(feedback).toEqual({ result: failure("ROOM_FULL") });
  expect(requests).toEqual(["/api/lobbies/join"]);
});
it("preserves the conflict when no current room exists, rather than inventing a successful join", async () => {
  expect(
    await sendLobbyCommand("/api/lobbies/join", {}, async (url) =>
      Response.json(
        url === "/api/lobbies/me" ? success(null) : failure("CONFLICT"),
      ),
    ),
  ).toEqual({ result: failure("CONFLICT") });
});
it("preserves the original refusal when the conflict refresh is temporarily unavailable", async () => {
  expect(
    await sendLobbyCommand("/api/lobbies/join", {}, async (url) => {
      if (url === "/api/lobbies/me") throw new Error("Offline");
      return Response.json(failure("CONFLICT"));
    }),
  ).toEqual({ result: failure("CONFLICT") });
});
it("keeps successful commands and failed leave commands explicit", async () => {
  expect(
    await sendLobbyCommand("/api/lobbies", {}, async () =>
      Response.json(success(currentRoom)),
    ),
  ).toEqual({ result: success(currentRoom) });
  const requests: string[] = [];
  expect(
    await sendLobbyCommand("/api/lobbies/ABC234/leave", {}, async (url) => {
      requests.push(url);
      return Response.json(failure("CONFLICT"));
    }),
  ).toEqual({ result: failure("CONFLICT") });
  expect(requests).toEqual(["/api/lobbies/ABC234/leave"]);
});
