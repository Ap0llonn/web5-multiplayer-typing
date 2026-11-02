import { expect, test, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

test.use({ trace: "off" });
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
async function signup(context: BrowserContext) {
  const username = `quick${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const response = await context.request.post("/api/auth/sign-up/email", {
    headers: { origin },
    data: {
      name: username,
      username,
      email: `${username}@example.test`,
      password: "test-password-123",
    },
  });
  expect(response.status()).toBe(200);
}
for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  test(`${locale}: quick play selects the closest room, joins a real guest, and distinguishes account/guest empty states`, async ({
    browser,
  }) => {
    const contexts = await Promise.all(
      [230, 231, 232, 233].map((ip) =>
        browser.newContext({
          extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${ip}` },
        }),
      ),
    );
    const [larger, closest, visitor, account] = contexts;
    try {
      for (const context of [larger, closest, account]) await signup(context);
      const rooms: Array<{ context: BrowserContext; code: string }> = [];
      for (const [context, capacity] of [
        [larger, 8],
        [closest, 2],
      ] as const) {
        const response = await context.request.post("/api/lobbies", {
          headers: { origin },
          data: {
            name: `Quick ${capacity} ${crypto.randomUUID().slice(0, 6)}`,
            capacity,
            role: "PARTICIPANT",
            visibility: "PUBLIC",
          },
        });
        expect(response.status()).toBe(200);
        const { value } = await response.json();
        rooms.push({ context, code: value.code });
        // Keep both hosts alive while the browser completes guest setup.
        await (await context.newPage()).goto(`/${locale}/play/room`);
      }
      const page = await visitor.newPage();
      await page.goto(`/${locale}/lobbies`);
      await page
        .getByRole("button", { name: messages.quickPlay.action, exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/${locale}/play/player\\?code=${rooms[1].code}$`),
      );
      expect(
        (await visitor.cookies()).some((cookie) =>
          cookie.name.includes("session_token"),
        ),
      ).toBe(false);
      await page.getByLabel(messages.guestName).fill("Quick Guest");
      await page
        .getByRole("button", { name: messages.guest, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/play/room/?$`));
      await expect(page.getByTestId("member-row")).toHaveCount(2);
      const member = await (
        await visitor.request.get("/api/lobbies/me")
      ).json();
      expect(member.value.code).toBe(rooms[1].code);
      const signedIn = await account.newPage();
      await signedIn.goto(`/${locale}/lobbies`);
      await signedIn
        .getByRole("button", { name: messages.quickPlay.action, exact: true })
        .click();
      await expect(signedIn).toHaveURL(
        new RegExp(`/${locale}/play/player\\?code=${rooms[0].code}$`),
      );
      expect(
        (await (await account.request.get("/api/lobbies/me")).json()).value,
      ).toBeNull();
      for (const room of rooms) {
        expect(
          (
            await room.context.request.post(`/api/lobbies/${room.code}/leave`, {
              headers: { origin },
              data: {},
            })
          ).status(),
        ).toBe(200);
      }
      await page.goto(`/${locale}/lobbies`);
      await page
        .getByRole("button", { name: messages.quickPlay.action, exact: true })
        .click();
      const guestCard = page.getByTestId("quick-play");
      await expect(guestCard.getByRole("status")).toHaveText(
        messages.quickPlay.emptyGuest,
      );
      await expect(guestCard.getByRole("link")).toHaveCount(0);
      await signedIn.goto(`/${locale}/lobbies`);
      await signedIn
        .getByRole("button", { name: messages.quickPlay.action, exact: true })
        .click();
      const accountCard = signedIn.getByTestId("quick-play");
      await expect(accountCard.getByRole("status")).toContainText(
        messages.quickPlay.emptyAccount,
      );
      await expect(
        accountCard.getByRole("link", {
          name: messages.siteNav.createRace,
          exact: true,
        }),
      ).toHaveAttribute("href", `/${locale}/play/create`);
      for (const width of [360, 1280]) {
        await signedIn.setViewportSize({ width, height: 900 });
        expect(
          await signedIn.evaluate(
            () =>
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
          ),
        ).toBe(false);
        expect(
          (
            await new AxeBuilder({ page: signedIn })
              .include("main")
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
      }
      const dark = signedIn.getByRole("button", {
        name: messages.dark,
        exact: true,
      });
      if (await dark.count()) await dark.click();
      await expect(signedIn.locator("html")).toHaveClass(/dark/);
      expect(
        (
          await new AxeBuilder({ page: signedIn })
            .include("main")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      if (locale === "en")
        await signedIn.screenshot({
          path: "test-results/quick-play-desktop-dark.png",
          fullPage: true,
        });
      await accountCard
        .getByRole("link", { name: messages.siteNav.createRace, exact: true })
        .click();
      await expect(signedIn).toHaveURL(new RegExp(`/${locale}/play/create/?$`));
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
}
test("quick play reports a server failure and supports retry without false empty success", async ({
  page,
}) => {
  await page.goto("/en/lobbies");
  await page.route("**/api/lobbies/quick", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: { code: "INTERNAL", messageKey: "errors.INTERNAL" },
      }),
    }),
  );
  const card = page.getByTestId("quick-play");
  await card
    .getByRole("button", { name: en.quickPlay.action, exact: true })
    .click();
  await expect(card.getByRole("alert")).toHaveText(en.errors.INTERNAL);
  await expect(card.getByRole("status")).toHaveCount(0);
  await page.unroute("**/api/lobbies/quick");
  await card
    .getByRole("button", { name: en.quickPlay.action, exact: true })
    .click();
  await expect(card.getByRole("alert")).toHaveCount(0);
  await expect(card.getByRole("status")).toHaveText(en.quickPlay.emptyGuest);
});
