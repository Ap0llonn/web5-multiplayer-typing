export type LobbyActor = {
  playerIdentityId: string;
  kind: "guest" | "account";
  displayName: string;
};
export type LobbyRole = "PARTICIPANT" | "SPECTATOR";
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
};
export type LobbyMember = {
  playerIdentityId: string;
  kind: "guest" | "account";
  displayName: string;
  role: LobbyRole;
  joinedAt: number;
  lastSeenAt: number;
};
export type Lobby = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  hostPlayerIdentityId: string;
  state: LobbyState;
  version: number;
  members: LobbyMember[];
};
export type LobbySnapshot = Omit<Lobby, "members"> & {
  members: Array<Omit<LobbyMember, "lastSeenAt"> & { online: boolean }>;
};
