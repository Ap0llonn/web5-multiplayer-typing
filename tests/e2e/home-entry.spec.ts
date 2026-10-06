import { expect, test } from "@playwright/test";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  test(`${locale}: home only links to dedicated join and create pages`, async ({
    page,
  }) => {
    const commands: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname.startsWith("/api/lobbies")
      )
        commands.push(request.url());
    });
    await page.goto(`/${locale}`);
    await expect(page.getByRole("main").locator("form, input")).toHaveCount(0);
    await page.getByRole("link", { name: messages.join, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/play/?$`));
    await expect(page.getByRole("main").getByRole("textbox")).toHaveCount(1);
    await page.goto(`/${locale}`);
    await page
      .getByRole("link", { name: messages.create, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/play/create/?$`));
    await expect(
      page.getByText(messages.accountRequired, { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("main").locator("form")).toHaveCount(0);
    await expect(
      page
        .getByRole("main")
        .getByRole("link", { name: messages.signup, exact: true }),
    ).toBeVisible();
    expect(commands).toEqual([]);
  });
}
