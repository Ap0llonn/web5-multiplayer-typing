import "server-only";
import { getAuth } from "@/shared/infrastructure/auth/config";
import type { AuthPrincipal } from "../contracts/actor";
export async function readSession(
  headers: Headers,
): Promise<AuthPrincipal | null> {
  const session = await getAuth().api.getSession({
    headers,
    query: { disableCookieCache: true },
  });
  if (!session) return null;
  return {
    authUserId: session.user.id,
    kind: session.user.isAnonymous ? "guest" : "account",
    displayName: session.user.name,
  };
}
