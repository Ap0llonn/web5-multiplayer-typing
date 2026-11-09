import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { LobbySnapshot } from "../../src/modules/lobby/public";
import type { OperationResult } from "../../src/shared/contracts/operation-result";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

test.use({ trace: "off" });
async function expectWholeTrack(page: Page, count: number) {
  await expect(page.locator(".race-lane")).toHaveCount(count);
  const geometry = await page.locator(".race-lanes").evaluate((grid) => {
    const frame = grid.getBoundingClientRect();
    const controls = document
      .querySelector(".lobby-room-actions")
      ?.getBoundingClientRect();
    const panel = document
      .querySelector(".race-panel")
      ?.getBoundingClientRect();
    return {
      controlsOverlap: (controls?.bottom ?? 0) > (panel?.top ?? 0) + 1,
      overflows:
        grid.scrollHeight > grid.clientHeight + 1 ||
        grid.scrollWidth > grid.clientWidth + 1,
      lanes: [...grid.querySelectorAll<HTMLElement>(".race-lane")].map(
        (lane) => {
          const rect = lane.getBoundingClientRect();
          const runner = lane
            .querySelector(".race-runner")
            ?.getBoundingClientRect();
          return {
            contained:
              rect.left >= frame.left - 1 &&
              rect.right <= frame.right + 1 &&
              rect.top >= frame.top - 1 &&
              rect.bottom <= frame.bottom + 1 &&
              rect.bottom <= innerHeight,
            runnerSize: Math.min(runner?.width ?? 0, runner?.height ?? 0),
          };
        },
      ),
    };
  });
  expect(geometry.overflows).toBe(false);
  expect(geometry.controlsOverlap).toBe(false);
  for (const lane of geometry.lanes) {
    expect(lane.contained).toBe(true);
    expect(lane.runnerSize).toBeGreaterThanOrEqual(10);
  }
}
async function expectCursorInText(page: Page) {
  await expect
    .poll(() =>
      page.getByTestId("race-text").evaluate((passage) => {
        const cursor = passage.querySelector('[data-cursor="true"]');
        if (!cursor) return false;
        const frame = passage.getBoundingClientRect();
        const line = cursor.getBoundingClientRect();
        return line.top >= frame.top && line.bottom <= frame.bottom;
      }),
    )
    .toBe(true);
}
for (const count of [10, 30] as const)
  test(`${count} racers fit without track scrolling and a small fixed text window follows typing`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(60000);
    const locale = count === 10 ? "fr" : "en";
    const messages = locale === "fr" ? fr : en;
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      reducedMotion: count === 30 ? "reduce" : "no-preference",
      extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${count + 120}` },
    });
    const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
    let code: string | undefined;
    try {
      const username = `grid${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
      expect(
        (
          await context.request.post("/api/auth/sign-up/email", {
            headers: { origin },
            data: {
              username,
              name: "Track Host",
              email: `${username}@example.test`,
              password: "test-password-123",
            },
          })
        ).ok(),
      ).toBe(true);
      const created: OperationResult<LobbySnapshot> = await (
        await context.request.post("/api/lobbies", {
          headers: { origin },
          data: {
            name: `${count} racers on screen`,
            capacity: count,
            role: "PARTICIPANT",
          },
        })
      ).json();
      if (!created.ok) throw Error("Room missing");
      code = created.value.code;
      const command = (name: string, data: unknown) =>
        context.request.post(`/api/lobbies/${code}/race/${name}`, {
          headers: { origin },
          data,
        });
      expect(
        (
          await command("configure", {
            language: "en",
            mode: "random",
            complexity: "easy",
            wordCount: 100,
            durationSeconds: 180,
            correction: "free",
            bonuses: false,
            bots: Array.from({ length: count - 1 }, (_, index) => ({
              id: `grid-${index}`,
              level: 1,
            })),
          })
        ).ok(),
      ).toBe(true);
      expect((await command("start", {})).ok()).toBe(true);
      const page = await context.newPage();
      await page.goto(`/${locale}/play/room`);
      if (locale === "fr")
        await page
          .getByRole("button", { name: messages.dark, exact: true })
          .click();
      const input = page.getByRole("textbox", {
        name: messages.race.typingArea,
        exact: true,
      });
      await expect(input).toBeEnabled({ timeout: 10000 });
      await expectWholeTrack(page, count);
      const surface = page.locator(".race-input-surface");
      const before = await surface.boundingBox();
      expect(before?.height).toBeLessThanOrEqual(145);
      const state: OperationResult<LobbySnapshot | null> = await (
        await context.request.get("/api/lobbies/me")
      ).json();
      if (!state.ok || !state.value?.race?.self) throw Error("Text missing");
      const typed = state.value.race.self.text.slice(0, 250);
      await input.pressSequentially(typed, { delay: 65 });
      await expect(input).toHaveValue(typed);
      await expect(input).toBeFocused();
      expect(await surface.boundingBox()).toEqual(before);
      await expect
        .poll(() =>
          page.getByTestId("race-text").evaluate((el) => el.scrollTop),
        )
        .toBeGreaterThan(0);
      await expectCursorInText(page);
      await expectWholeTrack(page, count);
      expect(
        (
          await new AxeBuilder({ page })
            .include("main")
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`all-${count}-racers.png`),
      });
      await page.setViewportSize({ width: 900, height: 600 });
      await expectWholeTrack(page, count);
      await expectCursorInText(page);
      await page.screenshot({
        path: testInfo.outputPath(`all-${count}-racers-short-window.png`),
      });
      await page.setViewportSize({ width: 360, height: 780 });
      await expectWholeTrack(page, count);
      await expect(
        page.getByText(messages.race.physicalKeyboard, { exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`all-${count}-racers-mobile.png`),
      });
    } finally {
      if (code)
        await context.request.post(`/api/lobbies/${code}/leave`, {
          headers: { origin },
          data: {},
        });
      await context.close();
    }
  });
