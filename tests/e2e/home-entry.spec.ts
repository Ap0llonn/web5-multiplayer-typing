import { expect, test } from "@playwright/test";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  test(`${locale}: minimal home offers one join CTA and no creation`, async ({
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
    const main = page.getByRole("main");
    await expect(main.getByRole("heading")).toHaveCount(1);
    await expect(main.getByRole("link")).toHaveCount(1);
    await expect(
      main.getByRole("link", { name: messages.create, exact: true }),
    ).toHaveCount(0);
    await expect(main.locator("img, ol")).toHaveCount(0);
    await expect(
      main.getByText(messages.noAccountNeeded, { exact: true }),
    ).toBeVisible();
    const join = main.getByRole("link", { name: messages.join, exact: true });
    await expect(join).toHaveAttribute("href", `/${locale}/play`);
    await join.focus();
    await expect(join).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${locale}/play/?$`));
    await expect(page.getByRole("main").getByRole("textbox")).toHaveCount(1);
    expect(commands).toEqual([]);
  });
}
