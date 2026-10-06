import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

async function account(context: BrowserContext, prefix: string) {
  const username = `${prefix}${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const response = await context.request.post("/api/auth/sign-up/email", {
    headers: {
      origin: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    },
    data: {
      name: username,
      username,
      email: `${username}@example.test`,
      password: "test-password-123",
    },
  });
  expect(response.status()).toBe(200);
}
async function createRoom(
  page: Page,
  messages: typeof en,
  name: string,
  role: "PARTICIPANT" | "SPECTATOR" = "PARTICIPANT",
) {
  const form = page.locator("form").filter({
    has: page.getByRole("heading", { name: messages.create, exact: true }),
  });
  await form.getByLabel(messages.roomName).fill(name);
  await form.getByLabel(messages.capacity).fill("2");
  await form
    .getByRole("combobox", { name: messages.role, exact: true })
    .click();
  await page
    .getByRole("listbox", { name: messages.role, exact: true })
    .getByRole("option", { name: messages[role], exact: true })
    .click();
  await form
    .getByRole("button", { name: messages.create, exact: true })
    .click();
  await expect(page.getByTestId("room-code")).toBeVisible();
  return page.getByTestId("room-code").innerText();
}
async function join(page: Page, messages: typeof en, code: string) {
  const form = page.locator("form").filter({
    has: page.getByRole("heading", { name: messages.join, exact: true }),
  });
  await form.getByLabel(messages.code).fill(code);
  await form.getByRole("button", { name: messages.join, exact: true }).click();
}

test("a stale tab recovers its real room and requires an explicit leave before joining another", async ({
  browser,
}) => {
  const owner = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "192.0.2.201" },
  });
  const other = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "192.0.2.202" },
  });
  try {
    await account(owner, "stale");
    await account(other, "target");
    const first = await owner.newPage();
    const stale = await owner.newPage();
    const target = await other.newPage();
    const initialLookup = stale.waitForResponse("**/api/lobbies/me");
    await stale.goto("/en");
    expect(await (await initialLookup).json()).toMatchObject({
      ok: true,
      value: null,
    });
    await first.goto("/en");
    const originalCode = await createRoom(first, en, "Original room");
    await target.goto("/en");
    const targetCode = await createRoom(target, en, "Target room");
    const mutations: string[] = [];
    stale.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/lobbies"))
        mutations.push(new URL(request.url()).pathname);
    });
    await join(stale, en, targetCode);
    await expect(stale.getByRole("main").getByRole("alert")).toHaveText(
      en.roomConflict,
    );
    await expect(stale.getByTestId("room-code")).toHaveText(originalCode);
    await expect(
      stale.getByRole("button", { name: en.leave, exact: true }),
    ).toBeVisible();
    // Recovery renews presence in the original room, but must not change rooms.
    expect(
      mutations.filter(
        (path) => path !== `/api/lobbies/${originalCode}/heartbeat`,
      ),
    ).toEqual(["/api/lobbies/join"]);
    expect(
      await (await owner.request.get("/api/lobbies/me")).json(),
    ).toMatchObject({ ok: true, value: { code: originalCode } });
    await stale.getByRole("button", { name: en.leave, exact: true }).click();
    await expect(stale.getByTestId("room-code")).toHaveCount(0);
    await join(stale, en, targetCode);
    await expect(stale.getByTestId("room-code")).toHaveText(targetCode);
    await first.reload();
    await expect(first.getByTestId("room-code")).toHaveText(targetCode);
    await expect(first.getByTestId("member-row")).toHaveCount(2);
    await expect(stale.getByTestId("member-row")).toHaveCount(2);
    await expect(target.getByTestId("member-row")).toHaveCount(2);
  } finally {
    await owner.close();
    await other.close();
  }
});

for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  test(`${locale}: spectator host leaves two participant slots and join failures stay translated`, async ({
    browser,
  }) => {
    const contexts = await Promise.all(
      [0, 1, 2, 3].map((n) =>
        browser.newContext({
          extraHTTPHeaders: {
            "x-forwarded-for": `192.0.2.${(locale === "en" ? 210 : 220) + n}`,
          },
        }),
      ),
    );
    try {
      await account(contexts[0], "spectator");
      const pages = await Promise.all(
        contexts.map((context) => context.newPage()),
      );
      await pages[0].goto(`/${locale}`);
      const code = await createRoom(
        pages[0],
        messages,
        "Spectator host",
        "SPECTATOR",
      );
      await expect(pages[0].getByTestId("member-row")).toContainText(
        messages.SPECTATOR,
      );
      for (let n = 1; n < pages.length; n++) {
        await pages[n].goto(`/${locale}`);
        await pages[n].getByLabel(messages.guestName).fill(`Guest ${n}`);
        await pages[n]
          .getByRole("button", { name: messages.guest, exact: true })
          .click();
        await expect(pages[n].getByText(messages.guestLimit)).toBeVisible();
      }
      const visitor = pages[3];
      await join(visitor, messages, "OOOOOO");
      await expect(visitor.getByRole("main").getByRole("alert")).toHaveText(
        messages.errors.VALIDATION,
      );
      await join(visitor, messages, "ZZZZZZ");
      await expect(visitor.getByRole("main").getByRole("alert")).toHaveText(
        messages.errors.NOT_FOUND,
      );
      await join(pages[1], messages, code);
      await expect(pages[1].getByTestId("room-code")).toHaveText(code);
      await join(pages[2], messages, code);
      await expect(pages[0].getByTestId("member-row")).toHaveCount(3);
      await join(visitor, messages, code);
      await expect(visitor.getByRole("main").getByRole("alert")).toHaveText(
        messages.errors.ROOM_FULL,
      );
      await expect(visitor.getByTestId("room-code")).toHaveCount(0);
      await expect(visitor).toHaveURL(new RegExp(`/${locale}/?$`));
      await pages[0]
        .getByRole("button", { name: messages.leave, exact: true })
        .click();
      await expect(pages[0].getByTestId("room-code")).toHaveCount(0);
      await join(visitor, messages, code);
      await expect(visitor.getByRole("main").getByRole("alert")).toHaveText(
        messages.errors.ROOM_CLOSED,
      );
      await expect(visitor.getByTestId("room-code")).toHaveCount(0);
      await expect(visitor).toHaveURL(new RegExp(`/${locale}/?$`));
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
}
