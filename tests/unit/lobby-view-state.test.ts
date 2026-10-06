import { it, expect } from "vitest";
import { lobbyViewReducer } from "@/modules/lobby/presentation/room/lobby-view-state";
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
it("accepts a current recovery, shows its notice and invalidates an older initial response", () => {
  const initial = { room: null, generation: 0 };
  const recovered = lobbyViewReducer(initial, {
    type: "recovered",
    generation: 0,
    room,
  });
  expect(recovered).toMatchObject({
    room,
    generation: 1,
    conflictNotice: true,
  });
  expect(
    lobbyViewReducer(recovered, { type: "loaded", generation: 0, room: null }),
  ).toEqual(recovered);
});
it("does not resurrect a room or its conflict notice after a newer terminal event", () => {
  const requestGeneration = 0;
  const initialLoaded = lobbyViewReducer(
    { room: null, generation: 0 },
    { type: "loaded", generation: 0, room },
  );
  const revoked = lobbyViewReducer(initialLoaded, {
    type: "command",
    room: null,
  });
  expect(
    lobbyViewReducer(revoked, {
      type: "recovered",
      generation: requestGeneration,
      room,
    }),
  ).toEqual(revoked);
  expect(revoked).not.toHaveProperty("conflictNotice");
});
it("does not replace a newer initial lookup or stream snapshot with a delayed recovery", () => {
  const loaded = lobbyViewReducer(
    { room: null, generation: 0 },
    { type: "loaded", generation: 0, room },
  );
  expect(loaded.generation).toBe(1);
  const requestGeneration = loaded.generation;
  const newer = { ...room, version: 2, name: "Newer authoritative state" };
  const streamed = lobbyViewReducer(loaded, {
    type: "snapshot",
    code: room.code,
    room: newer,
  });
  expect(streamed.generation).toBe(2);
  expect(
    lobbyViewReducer(streamed, {
      type: "recovered",
      generation: requestGeneration,
      room,
    }),
  ).toEqual(streamed);
});
it("lets a conflict recovery supersede an earlier empty initial lookup", () => {
  const requestGeneration = 0;
  const empty = lobbyViewReducer(
    { room: null, generation: 0 },
    { type: "loaded", generation: 0, room: null },
  );
  expect(
    lobbyViewReducer(empty, {
      type: "recovered",
      generation: requestGeneration,
      room,
    }),
  ).toMatchObject({ room, conflictNotice: true });
});
it("rejects an older same-room recovery even when its request generation is current", () => {
  const state = { room: { ...room, version: 2 }, generation: 3 };
  expect(
    lobbyViewReducer(state, { type: "recovered", generation: 3, room }),
  ).toEqual(state);
});
