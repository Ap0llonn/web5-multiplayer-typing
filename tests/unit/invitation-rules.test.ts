import { expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  snapshot,
} from "@/modules/lobby/domain/lobby-rules";
import {
  createInvitation,
  redeemInvitation,
} from "@/modules/lobby/domain/invitation-rules";
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
function fixture(capacity = 3) {
  const result = createRoom(
    { name: "Invite", capacity, role: "PARTICIPANT" },
    host,
    "ABC234",
    0,
  );
  if (!result.ok) throw Error();
  return result.value;
}
it("only a present host creates an invitation and snapshots omit digests", () => {
  const room = fixture();
  expect(createInvitation(room, guest, "digest", 100).ok).toBe(false);
  expect(createInvitation(room, host, "digest", 100).ok).toBe(true);
  expect(JSON.stringify(snapshot(room, 100))).not.toContain("digest");
});
it("consumes once on successful admission, with idempotent retry for its member", () => {
  const room = fixture();
  createInvitation(room, host, "digest", 100);
  expect(
    redeemInvitation(room, guest, "PARTICIPANT", undefined, "digest", 200).ok,
  ).toBe(true);
  expect(
    redeemInvitation(room, guest, "PARTICIPANT", undefined, "digest", 201).ok,
  ).toBe(true);
  expect(
    redeemInvitation(
      room,
      { ...guest, playerIdentityId: "other" },
      "PARTICIPANT",
      undefined,
      "digest",
      202,
    ),
  ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
});
it("does not consume on full/banned rooms and expires at precisely one hour", () => {
  const room = fixture(2);
  createInvitation(room, host, "digest", 100);
  joinRoom(room, { ...guest, playerIdentityId: "full" }, "PARTICIPANT", 100);
  expect(
    redeemInvitation(room, guest, "PARTICIPANT", undefined, "digest", 200),
  ).toMatchObject({ ok: false, error: { code: "ROOM_FULL" } });
  expect(room.invitationLinks?.[0].claimedBy).toBeNull();
  room.bannedPlayerIdentityIds.push(guest.playerIdentityId);
  expect(
    redeemInvitation(room, guest, "SPECTATOR", undefined, "digest", 201).ok,
  ).toBe(false);
  expect(room.invitationLinks?.[0].claimedBy).toBeNull();
  expect(
    redeemInvitation(room, guest, "SPECTATOR", undefined, "digest", 3600100),
  ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
});
