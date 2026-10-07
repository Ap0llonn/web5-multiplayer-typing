import { expect, test } from "@playwright/test";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

test.use({ trace: "off" });

for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  test(`${locale}: home explains the entry flow and opens the dedicated join and host pages`, async ({
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
    await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(main.getByRole("link")).toHaveCount(2);
    const steps = main.getByRole("region", {
      name: messages.homeContent.stepsTitle,
    });
    await expect(steps.getByRole("listitem")).toHaveCount(3);
    for (const step of Object.values(messages.homeContent.steps)) {
      await expect(
        steps.getByRole("heading", { name: step.title, exact: true }),
      ).toBeVisible();
      await expect(
        steps.getByText(step.description, { exact: true }),
      ).toBeVisible();
    }
    await expect(
      main.getByText(messages.homeContent.hostAccountRequired, { exact: true }),
    ).toBeVisible();
    const create = main.getByRole("link", {
      name: messages.create,
      exact: true,
    });
    await expect(create).toHaveAttribute("href", `/${locale}/play/create`);
    await create.focus();
    await expect(create).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${locale}/play/create/?$`));
    await expect(
      page.getByRole("main").getByText(messages.accountRequired),
    ).toBeVisible();
    await expect(page.getByLabel(messages.roomName)).toHaveCount(0);

    await page.goto(`/${locale}`);
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
