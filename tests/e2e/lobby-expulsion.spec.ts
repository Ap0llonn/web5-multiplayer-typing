import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };

test.use({ trace: "off" });
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

for (const [locale, messages, role] of [
  ["fr", fr, "PARTICIPANT"],
  ["en", en, "SPECTATOR"],
] as const) {
  test(`${locale}: host confirms expulsion, all tabs lose access and rejoin stays forbidden`, async ({
    browser,
  }) => {
    const contexts = await Promise.all(
      [0, 1, 2].map((n) =>
        browser.newContext({
          viewport: { width: locale === "fr" ? 360 : 1280, height: 900 },
          colorScheme: locale === "fr" ? "dark" : "light",
          extraHTTPHeaders: {
            "x-forwarded-for": `192.0.2.${(locale === "fr" ? 140 : 150) + n}`,
          },
        }),
      ),
    );
    try {
      const [host, target, observer] = contexts;
      const username = `kick${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
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
        ).status(),
      ).toBe(200);
      for (const [context, name] of [
        [target, "Removed guest"],
        [observer, "Observer guest"],
      ] as const) {
        expect(
          (
            await context.request.post("/api/auth/sign-in/anonymous", {
              headers: { origin },
              data: { name },
            })
          ).status(),
        ).toBe(200);
      }
      const created = await host.request.post("/api/lobbies", {
        headers: { origin },
        data: { name: "Expulsion room", capacity: 3, role: "SPECTATOR" },
      });
      expect(created.status()).toBe(200);
      const {
        value: { code },
      } = await created.json();
      for (const [context, memberRole] of [
        [target, role],
        [observer, "PARTICIPANT"],
      ] as const) {
        expect(
          (
            await context.request.post("/api/lobbies/join", {
              headers: { origin },
              data: { code, role: memberRole },
            })
          ).status(),
        ).toBe(200);
      }
      const ownerPage = await host.newPage();
      const targetPage = await target.newPage();
      const secondTargetTab = await target.newPage();
      const observerPage = await observer.newPage();
      await Promise.all(
        [ownerPage, targetPage, secondTargetTab, observerPage].map((page) =>
          page.goto(`/${locale}/play/room`),
        ),
      );
      for (const page of [
        ownerPage,
        targetPage,
        secondTargetTab,
        observerPage,
      ]) {
        await expect(page.getByTestId("member-row")).toHaveCount(3);
      }
      await expect(ownerPage.getByRole("navigation")).toHaveCount(0);
      const removeLabel = messages.play.kickMember.replace(
        "{name}",
        "Removed guest",
      );
      await expect(
        targetPage.getByRole("button", { name: removeLabel, exact: true }),
      ).toHaveCount(0);
      const removeButton = ownerPage.getByRole("button", {
        name: removeLabel,
        exact: true,
      });
      await removeButton.focus();
      await ownerPage.keyboard.press("Enter");
      await expect(
        ownerPage.getByRole("button", {
          name: messages.play.cancelKick,
          exact: true,
        }),
      ).toBeFocused();
      const modal = ownerPage.getByRole("dialog", {
        name: removeLabel,
        exact: true,
      });
      await expect(modal).toBeVisible();
      await expect(ownerPage.locator("li dialog")).toHaveCount(0);
      expect(await modal.evaluate((element) => element.matches(":modal"))).toBe(
        true,
      );
      await ownerPage.keyboard.press("Tab");
      await expect(
        modal.getByRole("button", {
          name: messages.play.confirmKick,
          exact: true,
        }),
      ).toBeFocused();
      await ownerPage.keyboard.press("Shift+Tab");
      await expect(
        modal.getByRole("button", {
          name: messages.play.cancelKick,
          exact: true,
        }),
      ).toBeFocused();
      await ownerPage.keyboard.press("Escape");
      await expect(modal).toHaveCount(0);
      await expect(removeButton).toBeFocused();
      await removeButton.click();
      await ownerPage.mouse.click(4, 4);
      await expect(modal).toHaveCount(0);
      await expect(removeButton).toBeFocused();
      await removeButton.click();
      await ownerPage
        .getByRole("button", { name: messages.play.cancelKick, exact: true })
        .click();
      await expect(removeButton).toBeFocused();
      await expect(ownerPage.getByTestId("member-row")).toHaveCount(3);
      await ownerPage
        .getByRole("button", { name: removeLabel, exact: true })
        .click();
      await expect(
        ownerPage.getByText(
          messages.play.kickWarning.replace("{name}", "Removed guest"),
          { exact: true },
        ),
      ).toBeVisible();
      expect(
        (
          await new AxeBuilder({ page: ownerPage })
            .include("main")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await ownerPage.screenshot({
        path: test.info().outputPath("kick-confirmation.png"),
        fullPage: true,
      });
      let releaseFailure: () => void = () => {};
      const deferredFailure = new Promise<void>((resolve) => {
        releaseFailure = resolve;
      });
      await ownerPage.route("**/api/lobbies/*/kick", async (route) => {
        await deferredFailure;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: { code: "INTERNAL", messageKey: "errors.INTERNAL" },
          }),
        });
      });
      await modal
        .getByRole("button", { name: messages.play.confirmKick, exact: true })
        .click();
      await expect(
        modal.getByRole("button", { name: messages.pending, exact: true }),
      ).toBeDisabled();
      await ownerPage.keyboard.press("Escape");
      await expect(modal).toBeVisible();
      releaseFailure();
      await expect(modal.getByRole("alert")).toHaveText(
        messages.errors.INTERNAL,
      );
      await expect(ownerPage.getByTestId("member-row")).toHaveCount(3);
      await ownerPage.unroute("**/api/lobbies/*/kick");
      await ownerPage
        .getByRole("button", { name: messages.play.confirmKick, exact: true })
        .click();
      for (const page of [ownerPage, observerPage])
        await expect(page.getByTestId("member-row")).toHaveCount(2);
      for (const page of [targetPage, secondTargetTab]) {
        await expect(page.getByTestId("room-code")).toHaveCount(0);
        await expect(page.getByRole("main").getByRole("alert")).toHaveText(
          messages.errors.FORBIDDEN,
        );
      }
      await expect(
        ownerPage.getByRole("heading", {
          name: messages.play.rosterTitle,
          exact: true,
        }),
      ).toBeFocused();
      await targetPage.reload();
      await expect(targetPage.getByTestId("room-code")).toHaveCount(0);
      const rejoin = await target.request.post("/api/lobbies/join", {
        headers: { origin },
        data: { code, role },
      });
      expect(rejoin.status()).toBe(403);
      expect(await rejoin.json()).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });
      const heartbeat = await target.request.post(
        `/api/lobbies/${code}/heartbeat`,
        { headers: { origin }, data: {} },
      );
      expect(heartbeat.status()).toBe(403);
      await expect(ownerPage.getByTestId("member-row")).toHaveCount(2);
      expect(
        await ownerPage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
}
