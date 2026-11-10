import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };
import type { LobbySnapshot } from "../../src/modules/lobby/public";
import type { OperationResult } from "../../src/shared/contracts/operation-result";
test.use({ trace: "off" });

async function group(browser: Browser, locale: "fr" | "en") {
  const contexts: BrowserContext[] = [];
  const host = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "192.0.2.197" },
  });
  contexts.push(host);
  const username = `r${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  expect(
    (
      await host.request.post("/api/auth/sign-up/email", {
        headers: { origin },
        data: {
          name: username,
          username,
          email: `${username}@example.test`,
          password: "test-password-123",
        },
      })
    ).ok(),
  ).toBe(true);
  const created = await (
    await host.request.post("/api/lobbies", {
      headers: { origin },
      data: { name: "Keyboard race", capacity: 3, role: "PARTICIPANT" },
    })
  ).json();
  expect(created.ok).toBe(true);
  const code: string = created.value.code;
  const h = await host.newPage();
  await h.goto(`/${locale}/play/room`);
  async function join(name: string, role: "PARTICIPANT" | "SPECTATOR") {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        "x-forwarded-for":
          name === "Guest Racer" ? "192.0.2.198" : "192.0.2.199",
      },
    });
    contexts.push(context);
    expect(
      (
        await context.request.post("/api/auth/sign-in/anonymous", {
          headers: { origin },
          data: { name },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await context.request.post("/api/lobbies/join", {
          headers: { origin },
          data: { code, role },
        })
      ).ok(),
    ).toBe(true);
    const page = await context.newPage();
    await page.goto(`/${locale}/play/room`);
    return page;
  }
  return {
    host,
    h,
    code,
    origin,
    join,
    close: () => Promise.all(contexts.map((c) => c.close())),
  };
}
async function typeRace(page: Page, text: string, label: string) {
  const input = page.getByRole("textbox", { name: label, exact: true });
  await expect(input).toBeEnabled();
  await input.pressSequentially(text, { delay: 65 });
}
async function roomSnapshot(page: Page) {
  const result: OperationResult<LobbySnapshot | null> = await (
    await page.request.get("/api/lobbies/me")
  ).json();
  if (!result.ok || !result.value?.race) throw Error("Race snapshot missing");
  return result.value.race;
}
for (const locale of ["fr", "en"] as const)
  test(`${locale}: pickups activate automatically while track, passage and keyboard focus stay stable`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(60000);
    const messages = locale === "fr" ? fr : en;
    const t = messages.race;
    const s = await group(browser, locale);
    try {
      const guest = await s.join("Guest Racer", "PARTICIPANT");
      const spectator = await s.join("Race Watcher", "SPECTATOR");
      if (locale === "fr")
        await guest
          .getByRole("button", { name: messages.dark, exact: true })
          .click();
      await s.h.getByRole("button", { name: t.start, exact: true }).click();
      const input = guest.getByRole("textbox", {
        name: t.typingArea,
        exact: true,
      });
      await expect(guest.getByTestId("race-countdown")).toBeVisible();
      const layout = async () => ({
        track: await guest.locator(".race-track").boundingBox(),
        ownLane: await guest
          .locator('.race-lane[data-local="true"]')
          .boundingBox(),
        typing: await guest.locator(".race-input-surface").boundingBox(),
      });
      const before = await layout();
      await expect(guest.locator(".race-items")).toHaveCount(0);
      await expect(
        guest.getByRole("heading", { name: t.items.title, exact: true }),
      ).toHaveCount(0);
      await expect(input).toBeEnabled({ timeout: 10000 });
      expect(await layout()).toEqual(before);
      const original = await roomSnapshot(s.h);
      await typeRace(
        s.h,
        original.text.slice(0, Math.ceil(original.text.length * 0.4)),
        t.typingArea,
      );
      expect((await roomSnapshot(guest)).self?.items).toEqual([]);
      await expect(
        guest.locator('.race-lane[data-local="true"] [data-checkpoint="25"]'),
      ).toHaveAttribute("data-passed", "false");
      let manualRequests = 0;
      guest.on("request", (request) => {
        if (request.url().endsWith("/race/item")) manualRequests++;
      });
      await typeRace(
        guest,
        original.text.slice(0, Math.ceil(original.text.length / 4)),
        t.typingArea,
      );
      await expect
        .poll(async () => {
          const race = await roomSnapshot(guest);
          return race.events.filter(
            (event) =>
              event.actorId === event.targetId && event.outcome === "received",
          ).length;
        })
        .toBeGreaterThanOrEqual(2);
      const after = await roomSnapshot(guest);
      const selfId = after.players.find(
        (player) => player.displayName === "Guest Racer",
      )?.playerIdentityId;
      const received = after.events.find(
        (event) => event.actorId === selfId && event.outcome === "received",
      );
      if (!received) throw Error("Personal pickup missing");
      const used = after.events.find(
        (event) => event.id === received.id.replace(":received", ":used"),
      );
      expect(used?.at).toBe(received.at);
      expect(["applied", "blocked"]).toContain(used?.outcome);
      expect(after.self?.items).toEqual([]);
      expect(manualRequests).toBe(0);
      await expect(input).toBeFocused();
      expect(await layout()).toEqual(before);
      await expect(
        spectator.getByRole("log", { name: t.items.events }),
      ).toContainText(t.items[received.type]);
      expect(
        (
          await new AxeBuilder({ page: guest })
            .include("main")
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      const resume = after.self;
      if (!resume) throw Error("Draft missing");
      await typeRace(
        guest,
        resume.text.slice(resume.draft.length, resume.draft.length + 8),
        t.typingArea,
      );
      await expect(input).toBeFocused();
      expect(await layout()).toEqual(before);
      await guest.screenshot({
        path: testInfo.outputPath(`stable-race-${locale}.png`),
      });
      await guest.reload();
      await expect(input).toBeEnabled();
      expect(
        (await roomSnapshot(guest)).events.filter(
          (event) => event.id === used?.id,
        ),
      ).toHaveLength(1);
      expect((await roomSnapshot(guest)).self?.items).toEqual([]);
      await expect(guest.locator("[data-item]")).toHaveCount(0);
      await guest.setViewportSize({ width: 360, height: 780 });
      await expect(
        guest.getByText(t.physicalKeyboard, { exact: true }),
      ).toBeVisible();
      expect(
        await guest.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    } finally {
      await s.close();
    }
  });
for (const locale of ["en", "fr"] as const)
  test(`${locale}: two humans race, a spectator observes, drafts resume, results persist and the host replays`, async ({
    browser,
  }) => {
    test.setTimeout(60000);
    const messages = locale === "fr" ? fr : en;
    const t = messages.race;
    const s = await group(browser, locale);
    try {
      if (locale === "fr")
        await s.h
          .getByRole("button", { name: messages.dark, exact: true })
          .click();
      await expect(
        s.h.getByRole("button", { name: t.start, exact: true }),
      ).toBeDisabled();
      await expect(s.h.getByTestId("race-text")).toHaveCount(0);
      const g = await s.join("Guest Racer", "PARTICIPANT");
      const spectator = await s.join("Race Watcher", "SPECTATOR");
      await s.h
        .getByRole("link", { name: t.openSettings, exact: true })
        .click();
      await s.h
        .getByRole("combobox", { name: t.language, exact: true })
        .click();
      await s.h.getByRole("option", { name: t.en, exact: true }).click();
      await s.h.getByLabel(t.words, { exact: true }).fill("10");
      await s.h.getByRole("button", { name: t.save, exact: true }).click();
      await g.getByRole("link", { name: t.openSettings, exact: true }).click();
      await expect(
        g.getByText(
          t.summary
            .replace("{language}", t.en)
            .replace("{words}", "10")
            .replace("{mode}", t.required),
          { exact: false },
        ),
      ).toBeVisible();
      await g.getByRole("link", { name: t.backToRoom, exact: true }).click();
      await s.h.getByRole("link", { name: t.backToRoom, exact: true }).click();
      await s.h.getByRole("button", { name: t.start, exact: true }).click();
      await expect(g.getByTestId("race-countdown")).toBeVisible();
      await expect(
        spectator.getByText(t.spectating, { exact: true }),
      ).toBeVisible();
      await expect(
        spectator.getByRole("textbox", { name: t.typingArea, exact: true }),
      ).toHaveCount(0);
      const text = await s.h.getByTestId("race-text").innerText();
      expect(await g.getByTestId("race-text").innerText()).toBe(text);
      const forbidden = await g.request.post(
        `/api/lobbies/${s.code}/race/start`,
        { headers: { origin: s.origin }, data: {} },
      );
      expect(forbidden.status()).toBe(403);
      await expect(
        s.h.getByRole("textbox", { name: t.typingArea, exact: true }),
      ).toBeEnabled({ timeout: 10000 });
      const typingArea = s.h.getByRole("textbox", {
        name: t.typingArea,
        exact: true,
      });
      expect(
        await typingArea.evaluate((element, text) => {
          const data = new DataTransfer();
          data.setData("text/plain", text);
          return element.dispatchEvent(
            new ClipboardEvent("paste", {
              clipboardData: data,
              bubbles: true,
              cancelable: true,
            }),
          );
        }, text),
      ).toBe(false);
      await typingArea.pressSequentially("?z", { delay: 65 });
      await expect(typingArea).toHaveValue("?");
      await typingArea.press("Backspace");
      expect(
        (
          await new AxeBuilder({ page: s.h })
            .include("main")
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await s.h.screenshot({
        path: `test-results/race-live-${locale}.png`,
        fullPage: true,
      });
      await typeRace(s.h, text.slice(0, 3), t.typingArea);
      await expect
        .poll(
          async () =>
            (await (await s.host.request.get("/api/lobbies/me")).json()).value
              .race.self.draft,
        )
        .toBe(text.slice(0, 3));
      await s.h.reload();
      await expect(
        s.h.getByRole("textbox", { name: t.typingArea, exact: true }),
      ).toHaveValue(text.slice(0, 3));
      await Promise.all([
        typeRace(s.h, text.slice(3), t.typingArea),
        typeRace(g, text, t.typingArea),
      ]);
      for (const page of [s.h, g, spectator])
        await expect(
          page.getByRole("heading", { name: t.results, exact: true }),
        ).toBeVisible({ timeout: 10000 });
      await expect(s.h.getByRole("table")).toContainText(t.FINISHED);
      await s.h.reload();
      await expect(
        s.h.getByRole("heading", { name: t.results, exact: true }),
      ).toBeVisible();
      await expect(
        s.h.getByRole("button", { name: t.replay, exact: true }),
      ).toBeVisible();
      expect(
        (
          await new AxeBuilder({ page: s.h })
            .include("main")
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await s.h.screenshot({
        path: `test-results/race-results-${locale}.png`,
        fullPage: true,
      });
      await s.h.getByRole("button", { name: t.replay, exact: true }).click();
      await expect
        .poll(
          async () =>
            (await (await g.request.get("/api/lobbies/me")).json()).value.state,
        )
        .toBe("WAITING");
      await expect(
        g.getByRole("link", { name: t.openSettings, exact: true }),
      ).toBeVisible();
      await expect(s.h.getByTestId("race-text")).toHaveCount(0);
      await s.h.getByRole("button", { name: t.start, exact: true }).click();
      await expect(g.getByTestId("race-countdown")).toBeVisible();
      await g.setViewportSize({ width: 360, height: 780 });
      await expect(
        g.getByText(t.physicalKeyboard, { exact: true }),
      ).toBeVisible();
      expect(
        await g.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await s.h.getByRole("button", { name: t.abandon, exact: true }).click();
      await s.h
        .getByRole("dialog")
        .getByRole("button", { name: t.cancel, exact: true })
        .click();
      await expect(s.h.getByRole("dialog")).toHaveCount(0);
      await s.h.getByRole("button", { name: t.abandon, exact: true }).click();
      await s.h
        .getByRole("dialog")
        .getByRole("button", { name: t.abandon, exact: true })
        .click();
      await g.setViewportSize({ width: 1280, height: 800 });
      await g.getByRole("button", { name: t.abandon, exact: true }).click();
      await g
        .getByRole("dialog")
        .getByRole("button", { name: t.abandon, exact: true })
        .click();
      await expect(
        s.h.getByRole("heading", { name: t.results, exact: true }),
      ).toBeVisible();
      await expect(s.h.getByRole("table")).toContainText(t.ABANDONED);
      await s.h.getByRole("button", { name: t.close, exact: true }).click();
      await s.h
        .getByRole("dialog")
        .getByRole("button", { name: t.close, exact: true })
        .click();
      await expect(s.h).toHaveURL(new RegExp(`/${locale}/play$`));
    } finally {
      await s.close();
    }
  });

for (const locale of ["fr", "en"] as const)
  test(`${locale}: host configures real random text, bot level and room options; peers observe persisted settings between races`, async ({
    browser,
  }) => {
    test.setTimeout(90000);
    const t = (locale === "fr" ? fr : en).race;
    const s = await group(browser, locale);
    try {
      const spectator = await s.join("Race Watcher", "SPECTATOR");
      await expect(
        s.h.getByRole("spinbutton", { name: t.words, exact: true }),
      ).toHaveCount(0);
      await s.h
        .getByRole("link", { name: t.openSettings, exact: true })
        .click();
      await expect(s.h).toHaveURL(
        new RegExp(`/${locale}/play/room/settings/?$`),
      );
      await spectator
        .getByRole("link", { name: t.openSettings, exact: true })
        .click();
      await expect(s.h.getByRole("navigation")).toHaveCount(0);
      if (locale === "fr") {
        const openedAt = Date.now();
        await expect
          .poll(
            async () => {
              const current = await (
                await s.host.request.get("/api/lobbies/me")
              ).json();
              expect(current.ok).toBe(true);
              expect(current.value.code).toBe(s.code);
              return Date.now() - openedAt;
            },
            { timeout: 36000, intervals: [5000] },
          )
          .toBeGreaterThan(30000);
      }
      await expect(
        s.h.getByRole("textbox", { name: t.includeCharacters, exact: true }),
      ).toBeDisabled();
      await s.h
        .getByRole("combobox", { name: t.textMode, exact: true })
        .click();
      await s.h.getByRole("option", { name: t.random, exact: true }).click();
      await s.h
        .getByRole("combobox", { name: t.complexity, exact: true })
        .click();
      await s.h.getByRole("option", { name: t.easy, exact: true }).click();
      await s.h
        .getByRole("spinbutton", { name: t.words, exact: true })
        .fill("10");
      await s.h
        .getByRole("checkbox", { name: t.unlimited, exact: true })
        .check();
      for (const name of [
        t.punctuation,
        t.numbers,
        t.uppercase,
        t.items.enable,
      ])
        await s.h.getByRole("checkbox", { name, exact: true }).uncheck();
      await s.h
        .getByRole("textbox", { name: t.includeCharacters, exact: true })
        .fill("é");
      await s.h
        .getByRole("textbox", { name: t.excludeCharacters, exact: true })
        .fill("z");
      await s.h.getByRole("button", { name: t.addBot, exact: true }).click();
      await s.h.getByRole("button", { name: t.addBot, exact: true }).click();
      await s.h
        .getByRole("button", {
          name: t.removeBot.replace("{number}", "2"),
          exact: true,
        })
        .click();
      await s.h
        .getByRole("combobox", {
          name: t.botName.replace("{number}", "1"),
          exact: true,
        })
        .click();
      await s.h
        .getByRole("option", {
          name: t.botLevel.replace("{level}", "5"),
          exact: true,
        })
        .click();
      await s.h
        .getByRole("spinbutton", { name: t.capacity, exact: true })
        .fill("2");
      await s.h
        .getByRole("combobox", { name: t.visibility, exact: true })
        .click();
      await s.h.getByRole("option", { name: t.PUBLIC, exact: true }).click();
      await s.h.getByRole("button", { name: t.save, exact: true }).click();
      await expect
        .poll(
          async () =>
            (await (await spectator.request.get("/api/lobbies/me")).json())
              .value.raceSettings.mode,
        )
        .toBe("random");
      await expect(
        spectator.getByRole("button", { name: t.save, exact: true }),
      ).toHaveCount(0);
      await expect(
        spectator.getByText(t.botLevel.replace("{level}", "5"), {
          exact: false,
        }),
      ).toBeVisible();
      await s.h.reload();
      await expect(
        s.h.getByRole("textbox", { name: t.includeCharacters, exact: true }),
      ).toHaveValue("é");
      await expect(
        s.h.getByRole("spinbutton", { name: t.capacity, exact: true }),
      ).toHaveValue("2");
      for (const width of [360, 1280]) {
        await s.h.setViewportSize({ width, height: 900 });
        expect(
          await s.h.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await s.h
          .getByRole("button", {
            name:
              width === 360
                ? locale === "fr"
                  ? fr.dark
                  : en.dark
                : locale === "fr"
                  ? fr.light
                  : en.light,
            exact: true,
          })
          .click();
        const violations = (
          await new AxeBuilder({ page: s.h })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations;
        expect(violations).toEqual([]);
      }
      await spectator
        .getByRole("link", { name: t.backToRoom, exact: true })
        .click();
      await s.h.getByRole("link", { name: t.backToRoom, exact: true }).click();
      await s.h.getByRole("button", { name: t.start, exact: true }).click();
      await expect(
        s.h.getByRole("heading", { name: t.track, exact: true }),
      ).toBeVisible();
      await spectator.goto(`/${locale}/play/room/settings`);
      await expect(
        spectator.getByText(t.settingsLocked, { exact: true }),
      ).toBeVisible();
      await expect(spectator.locator("form")).toHaveCount(0);
      await spectator
        .getByRole("link", { name: t.backToRoom, exact: true })
        .click();
      const race = await roomSnapshot(s.h);
      expect(race.text.split(" ")).toHaveLength(10);
      expect(race.text).toContain("é");
      expect(race.text).not.toMatch(/[zA-Z0-9.,!?]/);
      expect(race.settings.language).toBe("fr");
      await expect(
        s.h.getByRole("button", { name: t.save, exact: true }),
      ).toHaveCount(0);
      await expect
        .poll(
          async () =>
            (await roomSnapshot(s.h)).players.find((p) => p.kind === "bot")
              ?.progress,
          { timeout: 15000 },
        )
        .toBeGreaterThan(0);
      expect(
        (
          await s.host.request.post(`/api/lobbies/${s.code}/race/abandon`, {
            headers: { origin: s.origin },
            data: {},
          })
        ).ok(),
      ).toBe(true);
      await expect(
        s.h.getByRole("heading", { name: t.results, exact: true }),
      ).toBeVisible({ timeout: 25000 });
      await s.h
        .getByRole("link", { name: t.openSettings, exact: true })
        .click();
      await s.h
        .getByRole("combobox", { name: t.textMode, exact: true })
        .click();
      await s.h.getByRole("option", { name: t.coherent, exact: true }).click();
      await s.h
        .getByRole("button", {
          name: t.removeBot.replace("{number}", "1"),
          exact: true,
        })
        .click();
      await s.h.getByRole("button", { name: t.save, exact: true }).click();
      await expect
        .poll(
          async () =>
            (await (await s.host.request.get("/api/lobbies/me")).json()).value
              .raceSettings.bots.length,
        )
        .toBe(0);
      expect((await roomSnapshot(s.h)).settings.bots).toHaveLength(1);
      await s.h.getByRole("link", { name: t.backToRoom, exact: true }).click();
      await s.h.getByRole("button", { name: t.replay, exact: true }).click();
      await expect(
        s.h.getByRole("button", { name: t.start, exact: true }),
      ).toBeDisabled();
      await s.h
        .getByRole("link", { name: t.openSettings, exact: true })
        .click();
      await expect(
        s.h.getByRole("textbox", { name: t.includeCharacters, exact: true }),
      ).toBeDisabled();
    } finally {
      await s.close();
    }
  });

test("typing happens directly on the race text without a separate visible typing box", async ({
  browser,
}) => {
  const s = await group(browser, "en");
  try {
    await s.join("Guest Racer", "PARTICIPANT");
    await s.h.getByRole("button", { name: en.race.start, exact: true }).click();
    const capture = s.h.getByRole("textbox", {
      name: en.race.typingArea,
      exact: true,
    });
    await expect(capture).toBeEnabled({ timeout: 10000 });
    expect(
      await capture.evaluate((element) => getComputedStyle(element).opacity),
    ).toBe("0");
    const target = await roomSnapshot(s.h);
    await s.h.locator(".race-input-surface").click();
    await expect(capture).toBeFocused();
    await s.h.keyboard.type(target.text.slice(0, 4), { delay: 100 });
    await expect
      .poll(async () => (await roomSnapshot(s.h)).self?.draft)
      .toBe(target.text.slice(0, 4));
  } finally {
    await s.close();
  }
});

test("guest race history survives signup and a new sign-in", async ({
  browser,
}) => {
  const s = await group(browser, "en");
  try {
    const guest = await s.join("Guest Racer", "PARTICIPANT");
    await s.h.getByRole("button", { name: en.race.start, exact: true }).click();
    await expect(
      guest.getByRole("textbox", { name: en.race.typingArea, exact: true }),
    ).toBeEnabled();
    for (const page of [guest, s.h]) {
      const response = await page.request.post(
        `/api/lobbies/${s.code}/race/abandon`,
        { headers: { origin: s.origin }, data: {} },
      );
      expect(response.ok()).toBe(true);
    }
    await guest.goto("/en/signup");
    const username = `gh${crypto.randomUUID().replaceAll("-", "").slice(0, 14)}`;
    await guest.getByLabel(en.username, { exact: true }).fill(username);
    await guest
      .getByLabel(en.email, { exact: true })
      .fill(`${username}@example.test`);
    await guest
      .getByLabel(en.password, { exact: true })
      .fill("test-password-123");
    await guest.getByRole("button", { name: en.signup, exact: true }).click();
    await expect(guest).toHaveURL(/\/en\/?$/);
    await guest.goto("/en/profile");
    await expect(guest.getByRole("table")).toBeVisible();
    await expect(guest.getByRole("table").locator("tbody tr")).toHaveCount(1);
    await guest
      .getByRole("link", { name: en.profile.fullResults, exact: true })
      .click();
    await expect(guest).toHaveURL(/\/profile\/races\//);
    await expect(guest.getByRole("table").locator("tbody tr")).toHaveCount(2);
    await expect(guest.locator(".race-podium")).toHaveCount(0);
    await expect(guest.locator(".podium-spotlight")).toHaveCount(0);
    await expect(
      guest.getByRole("button", { name: en.race.mutePodiumSound, exact: true }),
    ).toHaveCount(0);
    await expect(guest.locator(".race-results-scroll")).toHaveCSS(
      "animation-name",
      "none",
    );
    await guest.setViewportSize({ width: 390, height: 844 });
    await expect(guest.locator("body")).toHaveJSProperty("scrollWidth", 390);
    await guest.screenshot({
      path: "/tmp/race-archive-mobile.png",
      fullPage: true,
    });
    await guest.goto("/en/profile");
    await guest.getByRole("button", { name: en.logout, exact: true }).click();
    await expect(guest).toHaveURL(/\/en\/?$/);
    await guest.goto("/en/login");
    await guest.getByLabel(en.username, { exact: true }).fill(username);
    await guest
      .getByLabel(en.password, { exact: true })
      .fill("test-password-123");
    await guest.getByRole("button", { name: en.login, exact: true }).click();
    await expect(guest).toHaveURL(/\/en\/?$/);
    await guest.goto("/en/profile");
    await expect(guest.getByRole("table").locator("tbody tr")).toHaveCount(1);
  } finally {
    await s.close();
  }
});

test("winner gets a dramatic celebration with a calm reduced-motion alternative", async ({
  browser,
}) => {
  test.setTimeout(60000);
  const s = await group(browser, "en");
  try {
    await s.h.evaluate(() => {
      const originalSource = AudioContext.prototype.createBufferSource;
      AudioContext.prototype.createBufferSource = function () {
        document.documentElement.dataset.podiumClaps = String(
          Number(document.documentElement.dataset.podiumClaps ?? 0) + 1,
        );
        return originalSource.call(this);
      };
      const original = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () {
        document.documentElement.dataset.podiumNotes = String(
          Number(document.documentElement.dataset.podiumNotes ?? 0) + 1,
        );
        return original.call(this);
      };
    });
    const guest = await s.join("Guest Racer", "PARTICIPANT");
    await s.h.getByRole("button", { name: en.race.start, exact: true }).click();
    const race = await roomSnapshot(s.h);
    await typeRace(s.h, race.text, en.race.typingArea);
    expect(
      (
        await guest.request.post(`/api/lobbies/${s.code}/race/abandon`, {
          headers: { origin: s.origin },
          data: {},
        })
      ).ok(),
    ).toBe(true);
    await expect(s.h.locator('[data-celebrating="true"]')).toBeVisible();
    const sound = s.h.getByRole("button", {
      name: en.race.mutePodiumSound,
      exact: true,
    });
    await sound.click();
    await expect(
      s.h.getByRole("button", { name: en.race.enablePodiumSound, exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await s.h
      .getByRole("button", { name: en.race.enablePodiumSound, exact: true })
      .click();
    await expect
      .poll(() =>
        s.h.evaluate(() =>
          Number(document.documentElement.dataset.podiumClaps ?? 0),
        ),
      )
      .toBeGreaterThanOrEqual(2);
    await expect(s.h.locator(".podium-victory-kicker")).toHaveText(
      en.race.victoryHype,
    );
    await expect(s.h.locator(".podium-confetti i")).toHaveCount(96);
    await expect(s.h.locator(".podium-confetti i").first()).toHaveCSS(
      "animation-iteration-count",
      "infinite",
    );
    await expect(s.h.locator(".race-results-scroll")).toHaveCSS(
      "opacity",
      "1",
      { timeout: 10000 },
    );
    const first = await s.h
      .locator('.podium-reveal[data-rank="1"]')
      .boundingBox();
    const stage = await s.h.locator(".podium-stage").boundingBox();
    if (!first || !stage) throw Error("Podium missing");
    expect(
      Math.abs(first.x + first.width / 2 - stage.x - stage.width / 2),
    ).toBeLessThan(2);
    await expect(s.h.locator(".podium-spotlight")).toHaveCSS(
      "visibility",
      "hidden",
      { timeout: 10000 },
    );
    await s.h.screenshot({ path: "/tmp/dramatic-podium.png", fullPage: true });
    await s.h.emulateMedia({ reducedMotion: "reduce" });
    await expect(s.h.locator(".podium-confetti")).toBeHidden();
    await expect(s.h.locator(".podium-spotlight")).toBeHidden();
    await expect(s.h.locator(".podium-stage")).toHaveCSS(
      "animation-name",
      "none",
    );
  } finally {
    await s.close();
  }
});
