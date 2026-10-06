import { test, expect } from "@playwright/test";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
test("browser locale and theme persist with no hydration errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("Encountered a script tag")
    )
      errors.push(message.text());
  });
  await page.goto("/fr");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en/);
  await page.getByRole("button", { name: "Dark theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("heading", { name: en.heroTitle, exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 360, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("two real sessions create/join, stream roster and reconnect without duplicating members", async ({
  browser,
}) => {
  const host = await browser.newContext();
  const guest = await browser.newContext();
  const h = await host.newPage();
  const g = await guest.newPage();
  await h.goto("/en/signup");
  await h.getByLabel("Username").fill(`e2e${Date.now().toString().slice(-8)}`);
  await h.getByLabel("Email").fill(`e2e${Date.now()}@example.com`);
  await h.getByLabel("Password", { exact: true }).fill("test-password-123");
  const [signupResponse] = await Promise.all([
    h.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/sign-up/email") &&
        response.request().method() === "POST",
    ),
    h.getByRole("button", { name: "Create account", exact: true }).click(),
  ]);
  expect(signupResponse.status()).toBe(200);
  await expect(h).toHaveURL(/\/en\/?$/);
  await expect(
    h
      .getByRole("navigation")
      .getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await expect(
    h
      .getByRole("navigation")
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveCount(0);
  // Next renders a screen-reader route announcer with role=alert outside main.
  await expect(h.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(h.getByLabel("Room name")).toBeVisible();
  await h.getByLabel("Room name").fill("Test room");
  await h.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(h.getByTestId("room-code")).toBeVisible();
  const code = await h.getByTestId("room-code").innerText();
  await g.goto("/en");
  await g.getByLabel("Guest nickname").fill("Test Guest");
  await g.getByRole("button", { name: "Continue as guest" }).click();
  await expect(
    g.getByText("Guests can join a room, but cannot create one."),
  ).toBeVisible();
  await g.getByLabel("Room code").fill(code);
  await g.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(h.getByText("Test Guest", { exact: true })).toBeVisible({
    timeout: 10000,
  });
  await g.reload();
  await expect(g.getByTestId("member-row")).toHaveCount(2);
  await expect(h.getByTestId("member-row")).toHaveCount(2);
  await g.getByRole("button", { name: "Leave room" }).click();
  await expect(h.getByTestId("member-row")).toHaveCount(1, { timeout: 10000 });
  await h.getByRole("button", { name: "Leave room", exact: true }).click();
  await h
    .getByRole("navigation")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(
    h
      .getByRole("navigation")
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    h
      .getByRole("navigation")
      .getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
  await host.close();
  await guest.close();
});
test("bad login displays translated error without false success", async ({
  page,
}) => {
  await page.goto("/en/login");
  await page.getByLabel("Username").fill("missing");
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Sign in again or check your username and password.",
  );
  await expect(page).toHaveURL(/login/);
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
});
test("a delayed initial room lookup cannot erase a successful creation", async ({
  page,
}) => {
  const name = `delay${Date.now().toString().slice(-8)}`;
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers: {
      origin: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    },
    data: {
      name,
      username: name,
      email: `${name}@example.com`,
      password: "test-password-123",
    },
  });
  expect(signup.ok()).toBe(true);
  let release!: () => void;
  let intercepted!: () => void;
  const waiting = new Promise<void>((r) => {
    release = r;
  });
  const requestSeen = new Promise<void>((r) => {
    intercepted = r;
  });
  await page.route("**/api/lobbies/me", async (route) => {
    intercepted();
    await waiting;
    await route.fulfill({ json: { ok: true, value: null } });
  });
  await page.goto("/en");
  await requestSeen;
  await page.getByLabel("Room name").fill("Delayed lookup");
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.getByTestId("room-code")).toBeVisible();
  const code = await page.getByTestId("room-code").innerText();
  const loaded = page.waitForResponse("**/api/lobbies/me");
  release();
  await loaded;
  await expect(page.getByTestId("room-code")).toHaveText(code);
});
