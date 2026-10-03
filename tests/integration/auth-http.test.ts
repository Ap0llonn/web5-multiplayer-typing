import { expect, it, beforeAll, afterAll } from "vitest";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { testRequest, signup } from "../support/auth";
let auth: ReturnType<typeof createAuthentication>;
beforeAll(() => {
  auth = createAuthentication();
});
afterAll(() => prisma.$disconnect());
it("persists real signup, normalized username login, bad password and revocation", async () => {
  const username = `user${Date.now()}`;
  const created = await signup(auth, username);
  expect(created.response.status).toBe(200);
  expect(created.cookie).toContain("session_token");
  const duplicate = await testRequest(auth, "/sign-up/email", {
    name: username,
    email: `other${Date.now()}@example.com`,
    username: username.toUpperCase(),
    password: "test-password-123",
  });
  expect(duplicate.status).toBeGreaterThanOrEqual(400);
  const bad = await testRequest(auth, "/sign-in/username", {
    username,
    password: "incorrect-password",
  });
  expect(bad.status).toBeGreaterThanOrEqual(400);
  const login = await testRequest(auth, "/sign-in/username", {
    username,
    password: "test-password-123",
  });
  expect(login.status).toBe(200);
  const session = await testRequest(
    auth,
    "/get-session",
    undefined,
    created.cookie,
  );
  expect((await session.json()).user.id).toBe(created.user.id);
  const out = await testRequest(auth, "/sign-out", {}, created.cookie);
  expect(out.status).toBe(200);
  expect(
    await (
      await testRequest(auth, "/get-session", undefined, created.cookie)
    ).json(),
  ).toBeNull();
});
it("creates guest sessions, prevents repeat sign-in, preserves guest on account flow", async () => {
  const response = await testRequest(auth, "/sign-in/anonymous", {
    name: "Guest",
  });
  expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  const user = (await response.json()).user;
  expect(user.isAnonymous).toBe(true);
  expect(
    (await testRequest(auth, "/sign-in/anonymous", { name: "Guest" }, cookie))
      .status,
  ).toBeGreaterThanOrEqual(400);
  await testRequest(
    auth,
    "/sign-up/email",
    {
      name: "replacement",
      username: `replace${Date.now()}`,
      email: `replace${Date.now()}@example.com`,
      password: "test-password-123",
    },
    cookie,
  );
  expect(
    await prisma.user.findUnique({ where: { id: user.id } }),
  ).not.toBeNull();
});
it("rejects foreign origins and rate-limits repeated HTTP login attempts", async () => {
  const foreign = await auth.handler(
    new Request("http://localhost:3000/api/auth/sign-in/anonymous", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
        cookie: "test-cookie=present",
      },
      body: "{}",
    }),
  );
  expect(foreign.status).toBe(403);
  const statuses = [];
  for (let i = 0; i < 7; i++)
    statuses.push(
      (
        await testRequest(
          auth,
          "/sign-in/username",
          { username: "missing", password: "test-password-123" },
          undefined,
          "192.0.2.10",
        )
      ).status,
    );
  expect(statuses).toContain(429);
});
