import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { anonymous, username } from "better-auth/plugins";
import { prisma } from "../db/prisma";
import { readServerEnv } from "../env/server";
export function createAuthentication() {
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
export const getAuth = () => (instance ??= createAuthentication());
