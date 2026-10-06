import { expect, test, type Page } from "@playwright/test";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

// Authenticated requests contain session cookies; do not record network traces.
test.use({ trace: "off" });

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
}

// DES-04/06, A11Y-03/04 and I18N-01: decoration must not replace the real flows.
for (const [locale, messages] of [
  ["fr", fr],
  ["en", en],
] as const) {
  for (const width of [360, 1440]) {
    test(`${locale}/${width}: decorative keyboard loads and real entry points work with reduced motion`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
        colorScheme: width === 360 ? "dark" : "light",
        extraHTTPHeaders: {
          "x-forwarded-for": `192.0.2.${(locale === "fr" ? 230 : 232) + (width === 360 ? 0 : 1)}`,
        },
      });
      try {
        const page = await context.newPage();
        await page.goto(`/${locale}`);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        const illustration = page.getByTestId("keyboard-illustration");
        await expect(illustration).toBeVisible();
        await expect(illustration).toHaveAttribute("alt", "");
        await expect(illustration).toHaveAttribute("aria-hidden", "true");
        await expect
          .poll(() =>
            illustration.evaluate(
              (image: HTMLImageElement) =>
                image.complete && image.naturalWidth > 0,
            ),
          )
          .toBe(true);
        await expect(page.getByRole("img").and(illustration)).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                document.getAnimations().filter((animation) => {
                  const duration =
                    animation.effect?.getComputedTiming().duration;
                  return (
                    animation.playState === "running" &&
                    typeof duration === "number" &&
                    duration > 100
                  );
                }).length,
            ),
          )
          .toBe(0);

        const main = page.getByRole("main");
        await main
          .getByRole("link", { name: messages.login, exact: true })
          .click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/login$`));
        await expect(page.getByLabel(messages.username)).toBeVisible();
        await expectNoHorizontalOverflow(page);

        await page.goto(`/${locale}`);
        await page
          .getByLabel(messages.guestName)
          .fill(`Playful-${locale}-${width}`);
        await page
          .getByRole("button", { name: messages.guest, exact: true })
          .click();
        await expect(page.getByLabel(messages.code)).toBeVisible();
        await expect(page.getByLabel(messages.roomName)).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
      } finally {
        await context.close();
      }
    });
  }
}
