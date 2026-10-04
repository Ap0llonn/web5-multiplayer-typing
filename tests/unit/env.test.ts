import { expect, it } from "vitest";
import { readServerEnv } from "@/shared/infrastructure/env/server";
const base = {
  DATABASE_URL: "postgresql://test:test@localhost:55432/typing_test",
  BETTER_AUTH_SECRET: "test-secret-with-at-least-thirty-two-characters",
  BETTER_AUTH_URL: "http://localhost:3000",
};
it("rejects missing variables without leaking values", () => {
  expect(() => readServerEnv({})).toThrow("Invalid server configuration");
  expect(() =>
    readServerEnv({ ...base, DATABASE_URL: "password-private" }),
  ).toThrow("Invalid server configuration");
});
it("disables absent OAuth and rejects half-configured providers", () => {
  expect(readServerEnv(base).providers).toEqual({});
  for (const key of [
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
  ])
    expect(() => readServerEnv({ ...base, [key]: "private-value" })).toThrow(
      "Invalid server configuration",
    );
});
it("enables complete pairs and rejects production HTTP", () => {
  expect(
    Object.keys(
      readServerEnv({
        ...base,
        GITHUB_CLIENT_ID: "x",
        GITHUB_CLIENT_SECRET: "y",
      }).providers,
    ),
  ).toEqual(["github"]);
  expect(() =>
    readServerEnv({
      ...base,
      NODE_ENV: "production",
      BETTER_AUTH_URL: "http://example.com",
    }),
  ).toThrow("Invalid server configuration");
});

it("identifies invalid configuration keys without exposing submitted values", () => {
  const invalidValues = {
    ...base,
    DATABASE_URL: "private-database-value",
    BETTER_AUTH_SECRET: "short-private-secret",
  };
  let message = "";
  try {
    readServerEnv(invalidValues);
  } catch (error) {
    if (error instanceof Error) message = error.message;
  }
  expect(message).toContain("DATABASE_URL");
  expect(message).toContain("BETTER_AUTH_SECRET");
  expect(message).not.toContain(invalidValues.DATABASE_URL);
  expect(message).not.toContain(invalidValues.BETTER_AUTH_SECRET);
});
