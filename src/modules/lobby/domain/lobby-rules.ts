import { randomInt, randomUUID } from "node:crypto";
import { PRESENCE_FRESH_MS, PRESENCE_GRACE_MS } from "../contracts/presence";
import { abandonRace, advanceRace, raceSnapshot } from "./race-rules";
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
  LobbyCharacter,
} from "../contracts/lobby";
import {
  characterSchema,
  validateCreateInput,
} from "../contracts/lobby-schemas";
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
    visibility: parsed.data.visibility,
    code,
    name: parsed.data.name,
    capacity: parsed.data.capacity,
    hostPlayerIdentityId: actor.playerIdentityId,
    state: "WAITING",
    version: 1,
    bannedPlayerIdentityIds: [],
    members: [
      {
        ...actor,
        role: input.role,
        character: parsed.data.character ?? "cobalt",
        joinedAt: now,
        lastSeenAt: now,
      },
    ],
  });
}
export function joinRoom(
  room: Lobby,
  actor: LobbyActor,
  role: LobbyRole,
  now: number,
  character?: LobbyCharacter,
): OperationResult<Lobby> {
  if (character !== undefined && !characterSchema.safeParse(character).success)
    return failure("VALIDATION");
  if (room.bannedPlayerIdentityIds.includes(actor.playerIdentityId))
    return failure("FORBIDDEN");
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
    if (character !== undefined) existing.character = character;
    return success(room);
  }
  if (
    role === "PARTICIPANT" &&
    room.members.filter((m) => m.role === "PARTICIPANT").length + (room.raceSettings?.bots?.length ?? 0) >= room.capacity
  )
    return failure("ROOM_FULL");
  room.members.push({
    ...actor,
    role,
    character: character ?? "cobalt",
    joinedAt: now,
    lastSeenAt: now,
  });
  return success(room);
}
export function kickRoom(
  room: Lobby,
  actor: LobbyActor,
  targetPlayerIdentityId: string,
  now: number,
): OperationResult<Lobby> {
  for (const member of [...room.members])
    if (now - member.lastSeenAt > PRESENCE_GRACE_MS)
      leaveRoom(room, member.playerIdentityId, now);
  if (
    room.state === "CLOSED" ||
    actor.kind !== "account" ||
    actor.playerIdentityId !== room.hostPlayerIdentityId ||
    !room.members.some(
      (member) => member.playerIdentityId === actor.playerIdentityId,
    ) ||
    actor.playerIdentityId === targetPlayerIdentityId ||
    !room.members.some(
      (member) => member.playerIdentityId === targetPlayerIdentityId,
    )
  )
    return failure("FORBIDDEN");
  room.members = room.members.filter(
    (member) => member.playerIdentityId !== targetPlayerIdentityId,
  );
  advanceRace(room, now);
  room.bannedPlayerIdentityIds.push(targetPlayerIdentityId);
  return success(room);
}
export function leaveRoom(
  room: Lobby,
  playerIdentityId: string,
  now: number,
): OperationResult<Lobby> {
  if (!room.members.some((m) => m.playerIdentityId === playerIdentityId))
    return failure("FORBIDDEN");
  const actor = room.members.find(
    (m) => m.playerIdentityId === playerIdentityId,
  );
  if (room.race && actor) abandonRace(room, actor, now);
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
  advanceRace(room, now);
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
  advanceRace(room, now);
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
export function snapshot(
  room: Lobby,
  now: number,
  viewer?: string,
): LobbySnapshot {
  return {
    ...(room.raceSettings ? { raceSettings: room.raceSettings } : {}),
    ...(room.race !== undefined
      ? { race: raceSnapshot(room, now, viewer) }
      : {}),
    id: room.id,
    visibility: room.visibility,
    code: room.code,
    name: room.name,
    capacity: room.capacity,
    hostPlayerIdentityId: room.hostPlayerIdentityId,
    state: room.state,
    version: room.version,
    members: room.members.map(({ lastSeenAt, ...m }) => ({
      ...m,
      online: now - lastSeenAt <= PRESENCE_FRESH_MS,
    })),
  };
}
