import "server-only";
import { linkGuestSignup } from "@/modules/identity/server";
export async function preserveGuestOnSignup(
  guestUserId: string,
  accountUserId: string,
) {
  const result = await linkGuestSignup(guestUserId, accountUserId);
  if (!result.ok) throw new Error("Guest signup transfer failed");
}
