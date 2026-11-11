import {
  failure,
  success,
  type OperationResult,
} from "@/shared/contracts/operation-result";
import type {
  Lobby,
  LobbyActor,
  LobbyCharacter,
  LobbyRole,
} from "../contracts/lobby";
import { PRESENCE_GRACE_MS } from "../contracts/presence";
import { joinRoom } from "./lobby-rules";
export const INVITATION_LIFETIME_MS = 3600000;
export function createInvitation(
  room: Lobby,
  actor: LobbyActor,
  digest: string,
  now: number,
): OperationResult<Lobby> {
  if (
    actor.kind !== "account" ||
    room.hostPlayerIdentityId !== actor.playerIdentityId ||
    !room.members.some(
      (m) =>
        m.playerIdentityId === actor.playerIdentityId &&
        now - m.lastSeenAt <= PRESENCE_GRACE_MS,
    )
  )
    return failure("FORBIDDEN");
  if (!["WAITING", "RESULTS"].includes(room.state)) return failure("CONFLICT");
  const links = (room.invitationLinks ?? []).filter(
    (link) => link.expiresAt > now,
  );
  if (links.length >= 50) return failure("RATE_LIMITED");
  room.invitationLinks = [
    ...links,
    {
      digest,
      expiresAt: now + INVITATION_LIFETIME_MS,
      claimedBy: null,
      joinedAt: null,
    },
  ];
  return success(room);
}
export function redeemInvitation(
  room: Lobby,
  actor: LobbyActor,
  role: LobbyRole,
  character: LobbyCharacter | undefined,
  digest: string,
  now: number,
): OperationResult<Lobby> {
  const link = room.invitationLinks?.find(
    (entry) => entry.digest === digest && entry.expiresAt > now,
  );
  if (!link) return failure("NOT_FOUND");
  const member = room.members.find(
    (m) => m.playerIdentityId === actor.playerIdentityId,
  );
  if (link.claimedBy !== null) {
    return link.claimedBy === actor.playerIdentityId &&
      member?.joinedAt === link.joinedAt &&
      now - member.lastSeenAt <= PRESENCE_GRACE_MS &&
      room.state !== "CLOSED" &&
      !room.bannedPlayerIdentityIds.includes(actor.playerIdentityId)
      ? success(room)
      : failure("NOT_FOUND");
  }
  const result = joinRoom(room, actor, role, now, character);
  if (result.ok && (!member || now - member.lastSeenAt > PRESENCE_GRACE_MS)) {
    link.claimedBy = actor.playerIdentityId;
    link.joinedAt =
      room.members.find((m) => m.playerIdentityId === actor.playerIdentityId)
        ?.joinedAt ?? now;
  }
  return result;
}
