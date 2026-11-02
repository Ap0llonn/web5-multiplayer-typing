import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

test.use({ trace: "off" });
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  test(`${locale}: create public, discover anonymously, join as guest and update the directory`, async ({
    browser,
  }) => {
    const offset = locale === "en" ? 210 : 220;
    const owner = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${offset}` },
    });
    const hidden = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${offset + 1}` },
    });
    const visitor = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${offset + 2}` },
    });
    const observer = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${offset + 3}` },
    });
    try {
      for (const context of [owner, hidden]) {
        const username = `pub${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
        expect(
          (
            await context.request.post("/api/auth/sign-up/email", {
              headers: { origin },
              data: {
                name: username,
                username,
                email: `${username}@example.test`,
                password: "test-password-123",
              },
            })
          ).status(),
        ).toBe(200);
      }
      const suffix = crypto.randomUUID().slice(0, 8);
      const publicName = `Public crew ${suffix}`;
      const hiddenName = `Hidden crew ${suffix}`;
      expect(
        (
          await hidden.request.post("/api/lobbies", {
            headers: { origin },
            data: { name: hiddenName, capacity: 2, role: "PARTICIPANT" },
          })
        ).status(),
      ).toBe(200);
      const host = await owner.newPage();
      await host.goto(`/${locale}/play/create`);
      await host.getByLabel(messages.roomName).fill(publicName);
      await host.getByLabel(messages.capacity).fill("2");
      await host
        .getByRole("combobox", { name: messages.lobbies.visibility })
        .click();
      await host
        .getByRole("option", {
          name: messages.lobbies.publicVisibility,
          exact: true,
        })
        .click();
      await host
        .getByRole("button", { name: messages.create, exact: true })
        .click();
      await expect(host).toHaveURL(new RegExp(`/${locale}/play/room/?$`));
      const code = await host.getByTestId("room-code").innerText();
      await expect(
        host.getByText(messages.lobbies.publicVisibility, { exact: true }),
      ).toBeVisible();
      const page = await visitor.newPage();
      await page.goto(`/${locale}`);
      await page
        .getByRole("link", { name: messages.siteNav.seeLobbies, exact: true })
        .click();
      const row = page
        .getByTestId("public-lobby")
        .filter({ hasText: publicName });
      await expect(row).toBeVisible();
      await expect(page.getByText(hiddenName)).toHaveCount(0);
      await expect(row).toContainText("1 / 2");
      await row.getByRole("link", { name: messages.join, exact: true }).click();
      await expect(page).toHaveURL(
        new RegExp(`/${locale}/play/player\\?code=${code}$`),
      );
      await page.getByLabel(messages.guestName).fill("Public Guest");
      await page
        .getByRole("button", { name: messages.guest, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/play/room/?$`));
      await expect(host.getByTestId("member-row")).toHaveCount(2);
      const directory = await visitor.newPage();
      await directory.goto(`/${locale}/lobbies`);
      const fullRoom = directory
        .getByTestId("public-lobby")
        .filter({ hasText: publicName });
      await expect(fullRoom).toContainText("2 / 2");
      await expect(fullRoom).toContainText(messages.lobbies.full);
      // Full participant capacity still allows a spectator through the existing role form.
      const spectator = await observer.newPage();
      await spectator.goto(`/${locale}/lobbies`);
      await spectator
        .getByTestId("public-lobby")
        .filter({ hasText: publicName })
        .getByRole("link", { name: messages.join, exact: true })
        .click();
      await spectator.getByLabel(messages.guestName).fill("Public Observer");
      await spectator
        .getByRole("radio", { name: messages.SPECTATOR, exact: true })
        .check();
      await spectator
        .getByRole("button", { name: messages.guest, exact: true })
        .click();
      await expect(spectator).toHaveURL(new RegExp(`/${locale}/play/room/?$`));
      const spectatorCell = fullRoom.locator("dl div").filter({
        has: directory.getByText(messages.SPECTATOR, { exact: true }),
      });
      await expect(spectatorCell.locator("dd")).toHaveText("1", {
        timeout: 10000,
      });
      await expect(fullRoom).toContainText("2 / 2");
      for (const width of [360, 1440]) {
        await directory.setViewportSize({ width, height: 900 });
        expect(
          await directory.evaluate(
            () =>
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
          ),
        ).toBe(false);
        expect(
          (
            await new AxeBuilder({ page: directory })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
      }
      const dark = directory.getByRole("button", {
        name: messages.dark,
        exact: true,
      });
      if (await dark.count()) await dark.click();
      await expect(directory.locator("html")).toHaveClass(/dark/);
      expect(
        (
          await new AxeBuilder({ page: directory })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      if (locale === "en")
        await directory.screenshot({
          path: "test-results/public-lobbies-mobile.png",
          fullPage: true,
        });
      await host
        .getByRole("button", { name: messages.leave, exact: true })
        .click();
      await expect(fullRoom).toHaveCount(0, { timeout: 10000 });
      await expect(
        directory.getByText(messages.lobbies.emptyTitle, { exact: true }),
      ).toBeVisible();
      await hidden.request.post(
        `/api/lobbies/${(await (await hidden.request.get("/api/lobbies/me")).json()).value.code}/leave`,
        { headers: { origin }, data: {} },
      );
    } finally {
      await Promise.all([
        owner.close(),
        hidden.close(),
        visitor.close(),
        observer.close(),
      ]);
    }
  });
}

test("directory reports a refresh failure and recovers with the refresh button", async ({
  page,
}) => {
  await page.goto("/en/lobbies");
  await page.route("**/api/lobbies", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: { code: "INTERNAL", messageKey: "errors.INTERNAL" },
      }),
    }),
  );
  await page.getByRole("button", { name: en.refresh, exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    en.errors.INTERNAL,
  );
  await expect(
    page.getByText(en.lobbies.emptyTitle, { exact: true }),
  ).toHaveCount(0);
  await page.unroute("**/api/lobbies");
  await page.getByRole("button", { name: en.refresh, exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByText(en.lobbies.emptyTitle, { exact: true }),
  ).toBeVisible();
});
