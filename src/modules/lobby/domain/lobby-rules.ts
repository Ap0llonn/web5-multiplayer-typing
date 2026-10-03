import { randomInt, randomUUID } from "node:crypto";
import { PRESENCE_FRESH_MS, PRESENCE_GRACE_MS } from "../contracts/presence";
import {
  failure,
  success,
  type OperationResult,
} from "@/shared/contracts/operation-result";
import type {
  CreateLobbyInput,
  Lobby,
  LobbyActor,
  LobbyRole,
  LobbySnapshot,
} from "../contracts/lobby";
import { validateCreateInput } from "../contracts/lobby-schemas";
export function createCode() {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  return Array.from(
    { length: 6 },
    () => alphabet[randomInt(alphabet.length)],
  ).join("");
}
export function createRoom(
  input: CreateLobbyInput,
  actor: LobbyActor,
  code: string,
  now: number,
): OperationResult<Lobby> {
  if (actor.kind !== "account") return failure("FORBIDDEN");
  const parsed = validateCreateInput(input);
  if (!parsed.success) return failure("VALIDATION");
  return success({
    id: randomUUID(),
    code,
    name: parsed.data.name,
    capacity: parsed.data.capacity,
    hostPlayerIdentityId: actor.playerIdentityId,
    state: "WAITING",
    version: 1,
    members: [{ ...actor, role: input.role, joinedAt: now, lastSeenAt: now }],
  });
}
export function joinRoom(
  room: Lobby,
  actor: LobbyActor,
  role: LobbyRole,
  now: number,
): OperationResult<Lobby> {
  for (const member of [...room.members])
    if (now - member.lastSeenAt > PRESENCE_GRACE_MS)
      leaveRoom(room, member.playerIdentityId, now);
  if (room.state === "CLOSED") return failure("ROOM_CLOSED");
  if (!["WAITING", "RESULTS"].includes(room.state)) return failure("CONFLICT");
  const existing = room.members.find(
    (m) => m.playerIdentityId === actor.playerIdentityId,
  );
  if (existing) {
    existing.lastSeenAt = now;
    return success(room);
  }
  if (
    role === "PARTICIPANT" &&
    room.members.filter((m) => m.role === "PARTICIPANT").length >= room.capacity
  )
    return failure("ROOM_FULL");
  room.members.push({ ...actor, role, joinedAt: now, lastSeenAt: now });
  return success(room);
}
export function leaveRoom(
  room: Lobby,
  playerIdentityId: string,
  now: number,
): OperationResult<Lobby> {
  if (!room.members.some((m) => m.playerIdentityId === playerIdentityId))
    return failure("FORBIDDEN");
  room.members = room.members.filter(
    (m) => m.playerIdentityId !== playerIdentityId,
  );
  if (room.hostPlayerIdentityId === playerIdentityId) {
    const successor = room.members
      .filter(
        (m) => m.kind === "account" && now - m.lastSeenAt <= PRESENCE_GRACE_MS,
      )
      .sort(
        (a, b) =>
          a.joinedAt - b.joinedAt ||
          a.playerIdentityId.localeCompare(b.playerIdentityId),
      )[0];
    if (successor) room.hostPlayerIdentityId = successor.playerIdentityId;
    else {
      room.state = "CLOSED";
      room.members = [];
    }
  }
  return success(room);
}
export function observeRoom(
  room: Lobby,
  playerIdentityId: string,
  now: number,
): OperationResult<Lobby> {
  if (room.state === "CLOSED") return failure("ROOM_CLOSED");
  for (const member of [...room.members])
    if (now - member.lastSeenAt > PRESENCE_GRACE_MS)
      leaveRoom(room, member.playerIdentityId, now);
  if (room.members.length === 0) return failure("ROOM_CLOSED");
  const member = room.members.find(
    (m) => m.playerIdentityId === playerIdentityId,
  );
  if (!member) return failure("FORBIDDEN");
  return success(room);
}
export function heartbeatRoom(
  room: Lobby,
  playerIdentityId: string,
  now: number,
): OperationResult<Lobby> {
  const result = observeRoom(room, playerIdentityId, now);
  if (!result.ok) return result;
  const member = room.members.find(
    (m) => m.playerIdentityId === playerIdentityId,
  );
  if (!member) return failure("FORBIDDEN");
  member.lastSeenAt = now;
  return success(room);
}
export function snapshot(room: Lobby, now: number): LobbySnapshot {
  return {
    ...room,
    members: room.members.map(({ lastSeenAt, ...m }) => ({
      ...m,
      online: now - lastSeenAt <= PRESENCE_FRESH_MS,
    })),
  };
}
