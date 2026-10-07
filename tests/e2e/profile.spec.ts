import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

test.use({ trace: "off" });

test("profile navigation, name and photo persist through reload and a fresh sign-in", async ({
  page,
}) => {
  const username = `pr${Date.now()}`;
  await page.goto("/en/signup");
  await page.getByLabel(en.username, { exact: true }).fill(username);
  await page
    .getByLabel(en.email, { exact: true })
    .fill(`${username}@example.com`);
  await page.getByLabel(en.password, { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: en.signup, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: en.profile.title, exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/profile$/);
  await expect(page.getByLabel(en.profile.displayName)).toHaveValue(username);
  await page.getByLabel(en.profile.displayName).fill("Keyboard Friend");
  const photo = await sharp({
    create: { width: 500, height: 300, channels: 3, background: "#ffa594" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel(en.profile.photo, { exact: true })
    .setInputFiles({ name: "me.png", mimeType: "image/png", buffer: photo });
  await page.getByLabel(en.profile.displayName).press("Enter");
  await expect(page.getByRole("status")).toHaveText(en.profile.saved);
  await expect(
    page.getByRole("heading", { name: "Keyboard Friend", exact: true }),
  ).toBeVisible();
  const avatar = page.locator('img[src^="/api/profile/photo"]');
  await expect
    .poll(() =>
      avatar.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBe(256);
  await page.reload();
  await expect(page.getByLabel(en.profile.displayName)).toHaveValue(
    "Keyboard Friend",
  );
  await expect(page.getByText(`@${username}`, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: en.logout, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await page.goto("/en/login");
  await page.getByLabel(en.username, { exact: true }).fill(username);
  await page.getByLabel(en.password, { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: en.login, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await page.goto("/en/profile");
  await expect(page.getByLabel(en.profile.displayName)).toHaveValue(
    "Keyboard Friend",
  );
  await expect
    .poll(() =>
      avatar.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBe(256);
  await page.getByLabel(en.profile.photo, { exact: true }).setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await page
    .getByRole("button", { name: en.profile.save, exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    en.profile.validationError,
  );
  await expect(page.getByRole("status")).toBeEmpty();
});

test("profile uses the existing themes and translations without fake race data or mobile overflow", async ({
  page,
  request,
}) => {
  const username = `pv${Date.now()}`;
  const response = await request.post("/api/auth/sign-up/email", {
    headers: {
      origin: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
      "x-forwarded-for": "192.0.2.226",
    },
    data: {
      name: username,
      username,
      email: `${username}@example.com`,
      password: "test-password-123",
    },
  });
  expect(response.ok()).toBe(true);
  // The request fixture has its own cookie jar; copy only into this disposable context.
  const state = await request.storageState();
  await page.context().addCookies(state.cookies);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [locale, messages] of [
    ["en", en],
    ["fr", fr],
  ] as const) {
    for (const theme of ["light", "dark"] as const) {
      for (const width of [360, 820, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`/${locale}/profile`);
        await page
          .getByRole("button", { name: messages[theme], exact: true })
          .click();
        await expect(page.locator("html")).toHaveClass(new RegExp(theme));
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          messages.profile.title,
        );
        await expect(
          page.getByText(messages.profile.statsUnavailable, { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(messages.profile.historyUnavailable, { exact: true }),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
      }
    }
  }
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/profile$/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/profile-desktop-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.getByRole("button", { name: en.light, exact: true }).click();
  await page.screenshot({
    path: "test-results/profile-mobile-light.png",
    fullPage: true,
  });
});

test("direct profile access offers sign-in to visitors and no editing to guests", async ({
  page,
  request,
}) => {
  await page.goto("/fr/profile");
  await expect(
    page.getByText(fr.profile.signInNotice, { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main form")).toHaveCount(0);
  const response = await request.post("/api/auth/sign-in/anonymous", {
    headers: {
      origin: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
      "x-forwarded-for": "192.0.2.227",
    },
    data: { name: "Profile guest" },
  });
  expect(response.ok()).toBe(true);
  await page.context().addCookies((await request.storageState()).cookies);
  await page.goto("/fr/profile");
  await expect(
    page.getByText(fr.profile.guestNotice, { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main form")).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation")
      .getByRole("link", { name: fr.profile.title, exact: true }),
  ).toHaveCount(0);
});
