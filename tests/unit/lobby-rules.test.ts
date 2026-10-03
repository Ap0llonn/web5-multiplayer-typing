import { describe, it, expect } from "vitest";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  heartbeatRoom,
  createCode,
} from "@/modules/lobby/domain/lobby-rules";
import { validateCreateInput } from "@/modules/lobby/contracts/lobby-schemas";
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
const input = { name: "Room", capacity: 2, role: "PARTICIPANT" as const };
const fresh = () => {
  const r = createRoom(input, host, "ABC234", 0);
  if (!r.ok) throw Error();
  return r.value;
};
describe("authoritative lobby rules", () => {
  it("only accounts create rooms; capacity must be 2–30 and spectator hosts are permitted", () => {
    expect(createRoom(input, guest, "ABC234", 0)).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(validateCreateInput({ ...input, capacity: 31 }).success).toBe(false);
    expect(validateCreateInput({ ...input, capacity: 1 }).success).toBe(false);
    expect(
      createRoom({ ...input, role: "SPECTATOR" }, host, "ABC234", 0),
    ).toMatchObject({
      ok: true,
      value: { hostPlayerIdentityId: "host", members: [{ role: "SPECTATOR" }] },
    });
  });
  it("generates six unambiguous characters", () => {
    for (let n = 0; n < 200; n++)
      expect(createCode()).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
  });
  it("joins once, allows spectator beyond capacity and rejects excess participant", () => {
    const room = fresh();
    expect(joinRoom(room, guest, "PARTICIPANT", 1).ok).toBe(true);
    expect(joinRoom(room, guest, "PARTICIPANT", 2).ok).toBe(true);
    expect(room.members).toHaveLength(2);
    expect(
      joinRoom(room, { ...guest, playerIdentityId: "third" }, "PARTICIPANT", 2),
    ).toMatchObject({ ok: false, error: { code: "ROOM_FULL" } });
    expect(
      joinRoom(room, { ...guest, playerIdentityId: "watcher" }, "SPECTATOR", 3)
        .ok,
    ).toBe(true);
  });
  it("rejects entry during running and into closed rooms", () => {
    const room = fresh();
    room.state = "RACING";
    expect(joinRoom(room, guest, "PARTICIPANT", 1)).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
    room.state = "CLOSED";
    expect(joinRoom(room, guest, "PARTICIPANT", 1)).toMatchObject({
      ok: false,
      error: { code: "ROOM_CLOSED" },
    });
  });
  it("transfers host to longest-present active account, never guest", () => {
    const room = fresh();
    joinRoom(room, guest, "SPECTATOR", 1);
    joinRoom(room, { ...host, playerIdentityId: "next" }, "SPECTATOR", 2);
    expect(leaveRoom(room, host.playerIdentityId, 3).ok).toBe(true);
    expect(room.hostPlayerIdentityId).toBe("next");
  });
  it("closes room when host leaves without eligible successor", () => {
    const room = fresh();
    joinRoom(room, guest, "PARTICIPANT", 1);
    leaveRoom(room, "host", 2);
    expect(room.state).toBe("CLOSED");
    expect(room.members).toHaveLength(0);
  });
  it("preserves membership on reconnection within 30s and expires it after the grace window", () => {
    const room = fresh();
    joinRoom(room, guest, "PARTICIPANT", 1);
    heartbeatRoom(room, "host", 20000);
    expect(heartbeatRoom(room, "guest", 29000).ok).toBe(true);
    expect(
      room.members.find((m) => m.playerIdentityId === "guest"),
    ).toBeDefined();
    heartbeatRoom(room, "host", 31000);
    expect(
      room.members.find((m) => m.playerIdentityId === "guest"),
    ).toBeDefined();
    heartbeatRoom(room, "host", 60001);
    expect(
      room.members.find((m) => m.playerIdentityId === "guest"),
    ).toBeUndefined();
  });
});
it("reconciles an expired host before accepting a new join", () => {
  const room = fresh();
  expect(joinRoom(room, guest, "PARTICIPANT", 31000)).toMatchObject({
    ok: false,
    error: { code: "ROOM_CLOSED" },
  });
  expect(room.state).toBe("CLOSED");
});
