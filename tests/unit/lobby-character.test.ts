import { expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  snapshot,
} from "@/modules/lobby/domain/lobby-rules";
import { joinLobbySchema } from "@/modules/lobby/contracts/lobby-schemas";

const host = {
  playerIdentityId: "host",
  kind: "account" as const,
  displayName: "Host",
};
const guest = {
  playerIdentityId: "guest",
  kind: "guest" as const,
  displayName: "Guest",
};
function fresh() {
  const result = createRoom(
    { name: "Characters", capacity: 2, role: "PARTICIPANT" },
    host,
    "ABC234",
    0,
  );
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}
it("validates the four characters and refuses forged member identity", () => {
  for (const character of ["cobalt", "coral", "mint", "butter"])
    expect(
      joinLobbySchema.safeParse({
        code: "ABC234",
        role: "PARTICIPANT",
        character,
      }).success,
    ).toBe(true);
  expect(
    joinLobbySchema.safeParse({
      code: "ABC234",
      role: "PARTICIPANT",
      character: "purple",
    }).success,
  ).toBe(false);
  expect(
    joinLobbySchema.safeParse({
      code: "ABC234",
      role: "PARTICIPANT",
      character: "mint",
      playerIdentityId: "host",
    }).success,
  ).toBe(false);
});
it("shares the selected character and preserves it on an ordinary rejoin", () => {
  const room = fresh();
  expect(joinRoom(room, guest, "PARTICIPANT", 1, "mint").ok).toBe(true);
  expect(snapshot(room, 1).members).toMatchObject([
    { character: "cobalt" },
    { character: "mint" },
  ]);
  joinRoom(room, guest, "PARTICIPANT", 2);
  expect(room.members[1].character).toBe("mint");
  joinRoom(room, guest, "PARTICIPANT", 3, "coral");
  expect(room.members).toHaveLength(2);
  expect(room.members[0].character).toBe("cobalt");
  expect(room.members[1].character).toBe("coral");
});
