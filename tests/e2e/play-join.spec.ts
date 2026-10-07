import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

test.use({ trace: "off" });

for (const [locale, messages] of [
  ["fr", fr],
  ["en", en],
] as const) {
  test(`${locale}: play asks only for a code and guards direct player access`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/play`);
    const main = page.getByRole("main");
    const code = main.getByRole("textbox", {
      name: messages.play.roomCodeLabel,
    });
    await expect(main.getByRole("textbox")).toHaveCount(1);
    await expect(
      main.getByRole("button", { name: messages.create, exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText(/démo|demo|preview/i)).toHaveCount(0);
    for (const invalid of [
      "ABCDE",
      "AB0DEF",
      "ABODEF",
      "AB1DEF",
      "ABIDEF",
      "ABLDEF",
    ]) {
      await code.fill(invalid);
      await code.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/${locale}/play/?$`));
    }
    for (const width of [360, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
    for (const path of ["player", "player?code=INVALID", "room"]) {
      await page.goto(`/${locale}/play/${path}`);
      await expect(page).toHaveURL(new RegExp(`/${locale}/play/?$`));
    }
  });

  test(`${locale}: code then nickname joins a real room, survives reload and leaves explicitly`, async ({
    browser,
  }) => {
    const offset = locale === "fr" ? 150 : 160;
    const host = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${offset}` },
    });
    const guest = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${offset + 1}` },
    });
    try {
      const username = `play${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
      const signup = await host.request.post("/api/auth/sign-up/email", {
        headers: {
          origin: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
        },
        data: {
          name: username,
          username,
          email: `${username}@example.test`,
          password: "test-password-123",
        },
      });
      expect(signup.status()).toBe(200);
      const owner = await host.newPage();
      await owner.goto(`/${locale}`);
      await expect(owner.getByRole("main").locator("form")).toHaveCount(0);
      const createRoom = owner
        .getByRole("main")
        .getByRole("link", { name: messages.create, exact: true });
      await expect(createRoom).toHaveAttribute(
        "href",
        `/${locale}/play/create`,
      );
      await createRoom.click();
      await expect(owner).toHaveURL(new RegExp(`/${locale}/play/create/?$`));
      await owner.getByLabel(messages.roomName).fill("Play entry room");
      await owner
        .locator("form")
        .filter({
          has: owner.getByRole("heading", {
            name: messages.create,
            exact: true,
          }),
        })
        .getByRole("radiogroup")
        .getByText(messages.play.characters.butter, { exact: true })
        .click();
      await owner
        .getByRole("button", { name: messages.create, exact: true })
        .click();
      const code = await owner.getByTestId("room-code").innerText();
      await expect(owner).toHaveURL(new RegExp(`/${locale}/play/room/?$`));
      await expect(
        owner.getByRole("heading", { name: messages.heroTitle, exact: true }),
      ).toHaveCount(0);
      // A signed-in host also gets the single code field at /play.
      const accountEntry = await host.newPage();
      await accountEntry.goto(`/${locale}/play`);
      await expect(
        accountEntry.getByRole("main").getByRole("textbox"),
      ).toHaveCount(1);
      await expect(
        accountEntry.getByRole("button", {
          name: messages.create,
          exact: true,
        }),
      ).toHaveCount(0);
      await accountEntry.close();

      const player = await guest.newPage();
      const mutations: string[] = [];
      player.on("request", (request) => {
        if (request.method() === "POST")
          mutations.push(new URL(request.url()).pathname);
      });
      await player.goto(`/${locale}/play`);
      await player
        .getByLabel(messages.play.roomCodeLabel)
        .fill(code.toLowerCase());
      await player
        .getByRole("button", {
          name: messages.play.joinButton,
          exact: true,
        })
        .click();
      await expect(player).toHaveURL(
        new RegExp(`/${locale}/play/player\\?code=${code}$`),
      );
      await expect(player.getByLabel(messages.guestName)).toBeVisible();
      expect(mutations).toEqual([]);
      await player.getByLabel(messages.guestName).fill("Play Guest");
      await player
        .getByRole("radiogroup")
        .getByText(messages.play.characters.mint, { exact: true })
        .click();
      await player
        .getByRole("button", { name: messages.guest, exact: true })
        .click();
      await expect(player).toHaveURL(new RegExp(`/${locale}/play/room/?$`));
      await expect(player.getByTestId("room-code")).toHaveText(code);
      await expect(owner.getByTestId("member-row")).toHaveCount(2);
      await expect(player.getByTestId("member-row")).toHaveCount(2);
      const guestOnOwner = owner
        .getByTestId("member-row")
        .filter({ hasText: "Play Guest" });
      const guestOnPlayer = player
        .getByTestId("member-row")
        .filter({ hasText: "Play Guest" });
      await expect(
        guestOnOwner.locator('[data-character="mint"]'),
      ).toBeVisible();
      await expect(
        owner
          .getByTestId("member-row")
          .filter({ hasText: username })
          .locator('[data-character="butter"]'),
      ).toBeVisible();
      expect(mutations.slice(0, 2)).toEqual([
        "/api/auth/sign-in/anonymous",
        "/api/lobbies/join",
      ]);
      expect(mutations).not.toContain("/api/lobbies");
      await player.reload();
      await expect(player.getByTestId("room-code")).toHaveText(code);
      await expect(player.getByTestId("member-row")).toHaveCount(2);
      await expect(
        guestOnPlayer.locator('[data-character="mint"]'),
      ).toBeVisible();
      await player.setViewportSize({ width: 1440, height: 900 });
      const captionIcon = await player
        .locator(".lobby-stage-caption svg")
        .boundingBox();
      expect(captionIcon?.width).toBeLessThanOrEqual(24);
      const actionIcon = await player
        .locator(".lobby-room-actions svg")
        .first()
        .boundingBox();
      expect(actionIcon?.width).toBeLessThanOrEqual(24);
      await expect(player.locator(".lobby-clubhouse-art")).toHaveJSProperty(
        "complete",
        true,
      );
      await expect(player.locator(".lobby-clubhouse-art")).not.toHaveJSProperty(
        "naturalWidth",
        0,
      );
      if (locale === "en")
        await player.screenshot({
          path: "test-results/lobby-en-desktop.png",
          fullPage: true,
        });
      await player.setViewportSize({ width: 360, height: 900 });
      const dark = player.getByRole("button", {
        name: messages.dark,
        exact: true,
      });
      if (await dark.count()) await dark.click();
      await expect(player.locator("html")).toHaveClass(/dark/);
      expect(
        await player.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
      ).toBe(false);
      expect(
        (
          await new AxeBuilder({ page: player })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      if (locale === "en")
        await player.screenshot({
          path: "test-results/lobby-en-mobile.png",
          fullPage: true,
        });
      const editorHeartbeat = player.waitForResponse((response) =>
        response.url().endsWith(`/api/lobbies/${code}/heartbeat`),
      );
      await player
        .getByRole("button", { name: messages.play.editCharacter, exact: true })
        .click();
      await expect(
        player.getByRole("radio", {
          name: messages.play.characters.mint,
          exact: true,
        }),
      ).toBeChecked();
      expect((await editorHeartbeat).status()).toBe(200);
      await player
        .getByRole("radiogroup")
        .getByText(messages.play.characters.coral, { exact: true })
        .click();
      await player
        .getByRole("button", { name: messages.play.saveCharacter, exact: true })
        .click();
      await expect(player).toHaveURL(new RegExp(`/${locale}/play/room/?$`));
      await expect(
        guestOnOwner.locator('[data-character="coral"]'),
      ).toBeVisible();
      await expect(
        guestOnPlayer.locator('[data-character="coral"]'),
      ).toBeVisible();
      await expect(player.getByTestId("member-row")).toHaveCount(2);
      await player
        .getByRole("button", { name: messages.leave, exact: true })
        .click();
      await expect(player).toHaveURL(new RegExp(`/${locale}/play/?$`));
      await expect(owner.getByTestId("member-row")).toHaveCount(1);
      expect(await (await guest.request.get("/api/lobbies/me")).json()).toEqual(
        { ok: true, value: null },
      );
    } finally {
      await host.close();
      await guest.close();
    }
  });

  test(`${locale}: unknown room returns a real refusal without showing a mock room`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        "x-forwarded-for": locale === "fr" ? "192.0.2.152" : "192.0.2.162",
      },
    });
    try {
      const page = await context.newPage();
      await page.goto(`/${locale}/play/player?code=ZZZZZZ`);
      await page.getByLabel(messages.guestName).fill("Unknown Guest");
      await page
        .getByRole("button", { name: messages.guest, exact: true })
        .click();
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(
        messages.errors.NOT_FOUND,
      );
      await expect(page).toHaveURL(
        new RegExp(`/${locale}/play/player\\?code=ZZZZZZ$`),
      );
      await expect(page.getByTestId("room-code")).toHaveCount(0);
      expect(
        await (await context.request.get("/api/lobbies/me")).json(),
      ).toEqual({ ok: true, value: null });
    } finally {
      await context.close();
    }
  });
}
