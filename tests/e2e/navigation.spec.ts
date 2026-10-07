import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

test.use({ trace: "off" });

for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  test(`${locale}: navigation destinations, plain language toggle and signed-out actions work on mobile and desktop`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    for (const width of [360, 820, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const suffix of ["", "/play", "/play/create", "/lobbies"]) {
        await page.goto(`/${locale}${suffix}`);
        const nav = page.getByRole("navigation");
        for (const [name, path] of [
          [messages.siteNav.join, "/play"],
          [messages.siteNav.seeLobbies, "/lobbies"],
          [messages.siteNav.createRace, "/play/create"],
          [messages.login, "/login"],
          [messages.signup, "/signup"],
        ]) {
          const link = nav.getByRole("link", { name, exact: true });
          await expect(link).toBeVisible();
          await expect(link).toHaveAttribute("href", `/${locale}${path}`);
        }
        const active = nav.locator('[aria-current="page"]');
        await expect(active).toHaveCount(1);
        await expect(active).toHaveAttribute("href", `/${locale}${suffix}`);
        const language = nav.getByRole("button", {
          name:
            locale === "en"
              ? messages.switchToFrench
              : messages.switchToEnglish,
          exact: true,
        });
        await expect(language.locator("svg")).toHaveCount(1);
        await expect(language).not.toHaveAttribute("aria-haspopup");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
      }
    }
    for (const theme of ["light", "dark"] as const) {
      await page.setViewportSize({ width: 360, height: 900 });
      await page
        .getByRole("button", { name: messages[theme], exact: true })
        .click();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
    const nav = page.getByRole("navigation");
    await nav
      .getByRole("link", { name: messages.siteNav.join, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/play$`));
    await expect(page.getByLabel(messages.play.roomCodeLabel)).toBeVisible();
    await nav
      .getByRole("link", { name: messages.siteNav.createRace, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/play/create$`));
    await expect(
      page
        .getByRole("main")
        .getByRole("link", { name: messages.login, exact: true }),
    ).toBeVisible();
    await nav.getByRole("link", { name: messages.signup, exact: true }).click();
    await expect(
      page.getByLabel(messages.email, { exact: true }),
    ).toBeVisible();
    await nav.getByRole("link", { name: messages.login, exact: true }).click();
    await expect(
      page.getByLabel(messages.password, { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/navigation-${locale}-mobile.png`,
      fullPage: true,
    });
  });
}

test("account navigation stays consistent across site and play pages", async ({
  page,
}) => {
  const username = `nav${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const response = await page.request.post("/api/auth/sign-up/email", {
    headers: {
      origin: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
      "x-forwarded-for": "192.0.2.228",
    },
    data: {
      name: username,
      username,
      email: `${username}@example.test`,
      password: "test-password-123",
    },
  });
  expect(response.ok()).toBe(true);
  await page.setViewportSize({ width: 360, height: 900 });
  for (const path of ["/en", "/en/play", "/en/play/create", "/en/profile"]) {
    await page.goto(path);
    const nav = page.getByRole("navigation");
    await expect(
      nav.getByRole("link", { name: en.profile.title, exact: true }),
    ).toBeVisible();
    await expect(
      nav.getByRole("button", { name: en.logout, exact: true }),
    ).toBeVisible();
    await expect(
      nav.locator('a[href$="/login"], a[href$="/signup"]'),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: en.logout, exact: true }).click();
  await expect(
    page
      .getByRole("navigation")
      .getByRole("link", { name: en.signup, exact: true }),
  ).toBeVisible();
});
