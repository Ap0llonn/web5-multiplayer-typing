import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { InvitationTokens } from "../contracts/invitation";
export const invitationTokens: InvitationTokens = {
  create: () => randomBytes(32).toString("hex"),
  digest: (token) => createHash("sha256").update(token).digest("hex"),
};
