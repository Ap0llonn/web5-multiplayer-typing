export type AuthPrincipal = {
  authUserId: string;
  kind: "guest" | "account";
  displayName: string;
};
export type Actor = {
  playerIdentityId: string;
  kind: "guest" | "account";
  displayName: string;
};
