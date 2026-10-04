import "server-only";
import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.url().refine((v) => /^postgres(ql)?:/.test(v)),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NODE_ENV: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
});
export type ServerEnvKey = keyof z.infer<typeof schema>;
export class ServerConfigurationError extends Error {
  constructor(keys: readonly ServerEnvKey[]) {
    super(`Invalid server configuration: ${keys.join(", ")}`);
    this.name = "ServerConfigurationError";
  }
}
export type Provider = "github" | "discord";
export function readServerEnv(source: Record<string, string | undefined>) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const keys = parsed.error.issues
      .map((issue) => issue.path[0])
      .filter(
        (key): key is ServerEnvKey =>
          typeof key === "string" && key in schema.shape,
      );
    throw new ServerConfigurationError([...new Set(keys)]);
  }
  const data = parsed.data;
  const url = new URL(data.BETTER_AUTH_URL);
  if (
    (data.NODE_ENV === "production" &&
      url.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(url.hostname)) ||
    !["http:", "https:"].includes(url.protocol)
  )
    throw new ServerConfigurationError(["BETTER_AUTH_URL"]);
  const providers: Partial<
    Record<Provider, { clientId: string; clientSecret: string }>
  > = {};
  for (const name of ["github", "discord"] as const) {
    const id =
      data[name === "github" ? "GITHUB_CLIENT_ID" : "DISCORD_CLIENT_ID"];
    const secret =
      data[
        name === "github" ? "GITHUB_CLIENT_SECRET" : "DISCORD_CLIENT_SECRET"
      ];
    if (Boolean(id) !== Boolean(secret))
      throw new ServerConfigurationError(
        name === "github"
          ? ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"]
          : ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET"],
      );
    if (id && secret) providers[name] = { clientId: id, clientSecret: secret };
  }
  return {
    databaseUrl: data.DATABASE_URL,
    authSecret: data.BETTER_AUTH_SECRET,
    authUrl: url.origin,
    providers,
  };
}
export type ServerEnv = ReturnType<typeof readServerEnv>;
