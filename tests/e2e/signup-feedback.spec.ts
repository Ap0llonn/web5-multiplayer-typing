import { expect, test } from "@playwright/test";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

test.use({ trace: "off" });
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  test(`${locale}: signup distinguishes taken email and username and allows correction`, async ({
    browser,
  }) => {
    const original = await browser.newContext({
      extraHTTPHeaders: {
        "x-forwarded-for": `192.0.2.${locale === "en" ? 71 : 72}`,
      },
    });
    const applicant = await browser.newContext({
      extraHTTPHeaders: {
        "x-forwarded-for": `192.0.2.${locale === "en" ? 73 : 74}`,
      },
    });
    try {
      const username = `taken${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
      const alternative = `new${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
      const email = `${username}@example.test`;
      expect(
        (
          await original.request.post("/api/auth/sign-up/email", {
            headers: { origin },
            data: {
              name: username,
              username,
              email,
              password: "test-password-123",
            },
          })
        ).status(),
      ).toBe(200);
      const page = await applicant.newPage();
      await page.goto(`/${locale}/signup`);
      await page
        .getByLabel(messages.username, { exact: true })
        .fill(alternative);
      await page
        .getByLabel(messages.email, { exact: true })
        .fill(email.toUpperCase());
      await page
        .getByLabel(messages.password, { exact: true })
        .fill("test-password-123");
      const submit = page
        .getByRole("main")
        .getByRole("button", { name: messages.signup, exact: true });
      await submit.click();
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(
        messages.authErrors.emailTaken,
      );
      await expect(page).toHaveURL(new RegExp(`/${locale}/signup/?$`));
      await expect(submit).toBeEnabled();
      await expect(
        page.getByLabel(messages.username, { exact: true }),
      ).toHaveValue(alternative);
      expect((await applicant.request.get("/api/lobbies/me")).status()).toBe(
        401,
      );
      await page
        .getByLabel(messages.email, { exact: true })
        .fill(`${alternative}@example.test`);
      await page
        .getByLabel(messages.username, { exact: true })
        .fill(username.toUpperCase());
      await submit.click();
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(
        messages.authErrors.usernameTaken,
      );
      await expect(page).toHaveURL(new RegExp(`/${locale}/signup/?$`));
      await expect(submit).toBeEnabled();
      await page
        .getByLabel(messages.username, { exact: true })
        .fill(alternative);
      await submit.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/?$`));
      await expect(
        page
          .getByRole("navigation")
          .getByRole("button", { name: messages.logout, exact: true }),
      ).toBeVisible();
    } finally {
      await Promise.all([original.close(), applicant.close()]);
    }
  });
}
