import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { anonymous, username } from "better-auth/plugins";
import { prisma } from "../db/prisma";
import { readServerEnv } from "../env/server";
export type GuestAccountLink = (
  guestUserId: string,
  accountUserId: string,
) => Promise<void>;
export function createAuthentication(onGuestSignup?: GuestAccountLink) {
  const env = readServerEnv(process.env);
  return betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    secret: env.authSecret,
    baseURL: env.authUrl,
    trustedOrigins: [env.authUrl],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 604800,
      updateAge: 86400,
      cookieCache: { enabled: false },
    },
    account: { accountLinking: { enabled: false } },
    socialProviders: env.providers,
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/username": { window: 60, max: 5 },
        "/sign-in/anonymous": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 10 },
      },
    },
    advanced: {
      disableOriginCheck: false,
      disableCSRFCheck: false,
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
    },
    plugins: [
      username({ minUsernameLength: 3, maxUsernameLength: 20 }),
      anonymous({
        disableDeleteAnonymousUser: true,
        onLinkAccount: async ({ anonymousUser, newUser, ctx }) => {
          if (
            ctx.path !== "/sign-up/email" ||
            anonymousUser.user.id === newUser.user.id
          )
            return;
          await onGuestSignup?.(anonymousUser.user.id, newUser.user.id);
        },
        generateName: (ctx) => {
          const parsed = z
            .object({ name: z.string().trim().min(3).max(20) })
            .safeParse(ctx.body);
          if (!parsed.success)
            throw new APIError("BAD_REQUEST", {
              code: "INVALID_GUEST_NAME",
              message: "Invalid guest name",
            });
          return parsed.data.name;
        },
      }),
    ],
  });
}
let instance: ReturnType<typeof createAuthentication> | undefined;
let guestSignup: GuestAccountLink | undefined;
export const getAuth = (onGuestSignup?: GuestAccountLink) => {
  if (onGuestSignup) guestSignup = onGuestSignup;
  return (instance ??= createAuthentication(async (guest, account) => {
    if (!guestSignup) throw new Error("Guest signup handler unavailable");
    await guestSignup(guest, account);
  }));
};
