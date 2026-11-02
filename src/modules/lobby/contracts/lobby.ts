export type LobbyActor = {
  playerIdentityId: string;
  kind: "guest" | "account";
  displayName: string;
};
export type LobbyVisibility = "PUBLIC" | "CODE";
export type PublicLobbySummary = {
  code: string;
  name: string;
  capacity: number;
  participantCount: number;
  spectatorCount: number;
  hostName: string;
  state: LobbyState;
};
export type LobbyRole = "PARTICIPANT" | "SPECTATOR";
export type LobbyCharacter = "cobalt" | "coral" | "mint" | "butter";
export type LobbyState =
  | "WAITING"
  | "COUNTDOWN"
  | "RACING"
  | "RESULTS"
  | "CLOSED";
export type CreateLobbyInput = {
  name: string;
  capacity: number;
  role: LobbyRole;
  character?: LobbyCharacter;
  visibility?: LobbyVisibility;
};
export type LobbyMember = {
  playerIdentityId: string;
  kind: "guest" | "account";
  displayName: string;
  role: LobbyRole;
  character: LobbyCharacter;
  joinedAt: number;
  lastSeenAt: number;
};
export type Lobby = {
  id: string;
  visibility: LobbyVisibility;
  code: string;
  name: string;
  capacity: number;
  hostPlayerIdentityId: string;
  state: LobbyState;
  version: number;
  members: LobbyMember[];
  bannedPlayerIdentityIds: string[];
};
export type LobbySnapshot = Omit<
  Lobby,
  "members" | "bannedPlayerIdentityIds"
> & {
  members: Array<Omit<LobbyMember, "lastSeenAt"> & { online: boolean }>;
};
