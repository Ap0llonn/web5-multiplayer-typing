import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

test.use({ trace: "off" });

type PreviewMessages = typeof en.playPreview;

function observeApplicationRequests(page: Page) {
  const requests: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/") || !["GET", "HEAD"].includes(request.method()))
      requests.push(`${request.method()} ${path}`);
  });
  return requests;
}

function previewUrl(locale: string, step?: "player" | "room") {
  return new RegExp(`/${locale}/play${step ? `/${step}` : ""}/?$`);
}

function previewControls(page: Page, t: PreviewMessages) {
  const main = page.getByRole("main");
  return {
    main,
    code: main.getByRole("textbox", { name: t.roomCodeLabel, exact: true }),
    nickname: main.getByRole("textbox", { name: t.nicknameLabel, exact: true }),
    characters: main.getByRole("radiogroup", {
      name: t.styleLabel,
      exact: true,
    }),
    player: page.getByTestId("preview-local-player"),
  };
}

async function expectRoom(
  page: Page,
  locale: string,
  name: string,
  style: string,
) {
  await expect(page).toHaveURL(previewUrl(locale, "room"));
  const main = page.getByRole("main");
  await expect(main.getByRole("textbox")).toHaveCount(0);
  await expect(main.getByRole("radio")).toHaveCount(0);
  const player = page.getByTestId("preview-local-player");
  await expect(player).toHaveCount(1);
  await expect(player).toContainText(name);
  await expect(player.locator(`[data-style="${style}"]`)).toBeVisible();
}

async function expectAccessiblePreview(page: Page) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    controls: [
      ...document.querySelectorAll(
        "main input, main button, main [role=radio]",
      ),
    ]
      .filter((element) => {
        const bounds = element.getBoundingClientRect();
        return (
          bounds.width > 0 &&
          (bounds.left < -1 || bounds.right > window.innerWidth + 1)
        );
      })
      .map((element) => element.tagName),
  }));
  expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);
  expect(overflow.controls).toEqual([]);
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toHaveCount(1);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}

// Real page transitions inside a mock flow must not create accounts or rooms.
for (const [locale, messages] of [
  ["fr", fr],
  ["en", en],
] as const) {
  test(`${locale}: separate code, player and room pages support edits and browser history`, async ({
    page,
    context,
  }) => {
    const t = messages.playPreview;
    const requests = observeApplicationRequests(page);
    const response = await page.goto(`/${locale}/play`);
    expect(response?.status()).toBe(200);
    const { main, code, nickname, characters, player } = previewControls(
      page,
      t,
    );
    await expect(main.getByRole("textbox")).toHaveCount(1);
    for (const invalid of [
      "",
      "ABCDE",
      "AB0DEF",
      "ABODEF",
      "AB1DEF",
      "ABIDEF",
      "ABLDEF",
    ]) {
      await code.fill(invalid);
      await code.press("Enter");
      await expect(page).toHaveURL(previewUrl(locale));
      await expect(code).toBeVisible();
    }
    await code.fill(" abcd23 ");
    await code.press("Enter");
    await expect(page).toHaveURL(previewUrl(locale, "player"));
    await expect(main.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(
      main.getByText("ABCD23", { exact: true }).first(),
    ).toBeVisible();
    await expect(main.getByRole("textbox")).toHaveCount(1);
    await expect(nickname).toHaveAttribute("minlength", "3");
    await expect(nickname).toHaveAttribute("maxlength", "20");
    await expect(player).toHaveCount(0);
    await nickname.fill("ab");
    await expect(
      main.getByRole("button", { name: t.readyButton, exact: true }),
    ).toBeDisabled();
    await expect(characters.getByRole("radio")).toHaveCount(4);
    await expect(
      characters.getByRole("radio", { name: t.styles.cobalt, exact: true }),
    ).toBeChecked();
    await characters
      .getByRole("radio", { name: t.styles.cobalt, exact: true })
      .focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      characters.getByRole("radio", { name: t.styles.coral, exact: true }),
    ).toBeChecked();
    await characters.getByText(t.styles.mint, { exact: true }).click();
    await nickname.fill("PixelGuest");
    await nickname.press("Enter");
    await expectRoom(page, locale, "PixelGuest", "mint");
    await expect(main.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(
      main.getByText("ABCD23", { exact: true }).first(),
    ).toBeVisible();

    await main.getByRole("button", { name: t.editPlayer, exact: true }).click();
    await expect(page).toHaveURL(previewUrl(locale, "player"));
    await expect(nickname).toHaveValue("PixelGuest");
    await expect(
      characters.getByRole("radio", { name: t.styles.mint, exact: true }),
    ).toBeChecked();
    await nickname.fill("CancelledGuest");
    await characters.getByText(t.styles.butter, { exact: true }).click();
    await main.getByRole("button", { name: t.cancelEdit, exact: true }).click();
    await expectRoom(page, locale, "PixelGuest", "mint");

    await main.getByRole("button", { name: t.editPlayer, exact: true }).click();
    await expect(nickname).toHaveValue("PixelGuest");
    await nickname.fill("UpdatedGuest");
    await characters.getByText(t.styles.butter, { exact: true }).click();
    await main
      .getByRole("button", { name: t.updatePlayer, exact: true })
      .click();
    await expectRoom(page, locale, "UpdatedGuest", "butter");
    await expect(main.getByText("PixelGuest", { exact: true })).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(previewUrl(locale, "player"));
    await expect(nickname).toHaveValue("UpdatedGuest");
    await nickname.fill("UncommittedGuest");
    await page.goForward();
    await expectRoom(page, locale, "UpdatedGuest", "butter");
    await expect(player).not.toContainText("UncommittedGuest");
    await main
      .getByRole("button", { name: t.leaveButton, exact: true })
      .click();
    await expect(page).toHaveURL(previewUrl(locale));
    await expect(main.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(code).toHaveValue("");
    await page.goBack();
    await expect(page).toHaveURL(previewUrl(locale));
    await expect(player).toHaveCount(0);
    await code.fill("ZXCV23");
    await code.press("Enter");
    await expect(page).toHaveURL(previewUrl(locale, "player"));
    await expect(nickname).toHaveValue("");
    await expect(
      characters.getByRole("radio", { name: t.styles.cobalt, exact: true }),
    ).toBeChecked();
    await main.getByRole("button", { name: t.backButton, exact: true }).click();
    await expect(page).toHaveURL(previewUrl(locale));
    expect(requests).toEqual([]);
    expect(
      (await context.cookies())
        .map((cookie) => cookie.name)
        .filter((name) => name.includes("better-auth")),
    ).toEqual([]);
  });

  test(`${locale}: direct setup and room URLs and reloads safely reset missing mock state`, async ({
    page,
  }) => {
    const t = messages.playPreview;
    const requests = observeApplicationRequests(page);
    const { code, nickname, player } = previewControls(page, t);
    for (const step of ["player", "room"]) {
      await page.goto(`/${locale}/play/${step}`);
      await expect(page).toHaveURL(previewUrl(locale));
      await expect(code).toBeVisible();
      await expect(player).toHaveCount(0);
    }
    await code.fill("ABCDEF");
    await code.press("Enter");
    await expect(page).toHaveURL(previewUrl(locale, "player"));
    await page.reload();
    await expect(page).toHaveURL(previewUrl(locale));
    await expect(code).toHaveValue("");
    await code.fill("ABCDEF");
    await code.press("Enter");
    await nickname.fill("ReloadGuest");
    await nickname.press("Enter");
    await expect(page).toHaveURL(previewUrl(locale, "room"));
    await page.reload();
    await expect(page).toHaveURL(previewUrl(locale));
    await expect(code).toHaveValue("");
    await expect(player).toHaveCount(0);
    expect(requests).toEqual([]);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`${locale}/${theme}: all three preview pages are accessible at mobile, tablet and desktop sizes`, async ({
      browser,
    }) => {
      test.setTimeout(90000);
      const t = messages.playPreview;
      const context = await browser.newContext({
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      try {
        const page = await context.newPage();
        const requests = observeApplicationRequests(page);
        for (const width of [360, 820, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          const response = await page.goto(`/${locale}/play`);
          expect(response?.status()).toBe(200);
          await expect(page.locator("html")).toHaveClass(new RegExp(theme));
          await expect(page.locator("html")).toHaveAttribute("lang", locale);
          const { main, code, nickname } = previewControls(page, t);
          await expect(main.getByRole("textbox")).toHaveCount(1);
          await expectAccessiblePreview(page);
          await code.fill("ABCDEF");
          await main
            .getByRole("button", { name: t.joinButton, exact: true })
            .click();
          await expect(page).toHaveURL(previewUrl(locale, "player"));
          await expect(nickname).toBeVisible();
          await expectAccessiblePreview(page);
          await nickname.fill("Preview Guest");
          await main
            .getByRole("button", { name: t.readyButton, exact: true })
            .click();
          await expectRoom(page, locale, "Preview Guest", "cobalt");
          await expectAccessiblePreview(page);
        }
        expect(requests).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }
}
