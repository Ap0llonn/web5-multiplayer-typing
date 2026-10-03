import { expect, it } from "vitest";
import { lobbyViewReducer } from "@/modules/lobby/presentation/lobby-view-state";
import type { LobbySnapshot } from "@/modules/lobby/public";
const room: LobbySnapshot = {
  id: "room",
  code: "ABC234",
  name: "Current",
  capacity: 2,
  state: "WAITING",
  version: 3,
  hostPlayerIdentityId: "host",
  members: [],
};
it("ignores older structural snapshots and accepts a complete newer server resynchronization", () => {
  const state = { room, generation: 1 };
  expect(
    lobbyViewReducer(state, {
      type: "snapshot",
      code: room.code,
      room: { ...room, version: 2, name: "Stale" },
    }),
  ).toEqual(state);
  const updated = { ...room, version: 4, name: "Authoritative resync" };
  const resynced = lobbyViewReducer(state, {
    type: "snapshot",
    code: room.code,
    room: updated,
  });
  expect(resynced.room).toEqual(updated);
  expect(
    lobbyViewReducer(resynced, {
      type: "snapshot",
      code: room.code,
      room: updated,
    }).room,
  ).toEqual(updated);
});
it("does not apply an event from a previous room after a new room is selected", () => {
  const next = { ...room, id: "other", code: "XYZ234" };
  const state = lobbyViewReducer(
    { room, generation: 1 },
    { type: "command", room: next },
  );
  expect(
    lobbyViewReducer(state, {
      type: "snapshot",
      code: room.code,
      room: { ...room, version: 99 },
    }),
  ).toEqual(state);
});
