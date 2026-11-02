import type { Lobby, PublicLobbySummary } from "../contracts/lobby";

export function summarizePublicLobby(
  room: Lobby,
  activeSince: number,
): PublicLobbySummary | null {
  if (room.visibility !== "PUBLIC" || room.state === "CLOSED") return null;
  const members = room.members.filter(
    (member) => member.lastSeenAt >= activeSince,
  );
  const host =
    members.find(
      (member) => member.playerIdentityId === room.hostPlayerIdentityId,
    ) ??
    members
      .filter((member) => member.kind === "account")
      .sort(
        (a, b) =>
          a.joinedAt - b.joinedAt ||
          a.playerIdentityId.localeCompare(b.playerIdentityId),
      )[0];
  if (!host || host.kind !== "account") return null;
  return {
    code: room.code,
    name: room.name,
    capacity: room.capacity,
    participantCount: members.filter((member) => member.role === "PARTICIPANT")
      .length,
    spectatorCount: members.filter((member) => member.role === "SPECTATOR")
      .length,
    hostName: host.displayName,
    state: room.state,
  };
}
