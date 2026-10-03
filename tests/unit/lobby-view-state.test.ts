import { it, expect } from "vitest";
import { lobbyViewReducer } from "@/modules/lobby/presentation/lobby-view-state";
import type { LobbySnapshot } from "@/modules/lobby/public";
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
it("ignores a delayed initial null response after create or join succeeds", () => {
  const initial = { room: null, generation: 0 };
  const created = lobbyViewReducer(initial, { type: "command", room });
  const delayed = lobbyViewReducer(created, {
    type: "loaded",
    generation: 0,
    room: null,
  });
  expect(delayed.room).toEqual(room);
});
it("does not let an old stream resurrect a room after leave", () => {
  const left = lobbyViewReducer(
    { room, generation: 1 },
    { type: "command", room: null },
  );
  expect(
    lobbyViewReducer(left, { type: "snapshot", room, code: room.code }).room,
  ).toBeNull();
});
