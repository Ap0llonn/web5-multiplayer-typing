import { expect, test } from "@playwright/test";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  test(`${locale}: exhausted code attempts refuse a real join without reserving a seat, including after reload`, async ({
    browser,
  }) => {
    const host = await browser.newContext({
      extraHTTPHeaders: {
        "x-forwarded-for": `198.51.100.${locale === "en" ? 180 : 182}`,
      },
    });
    const guest = await browser.newContext({
      extraHTTPHeaders: {
        "x-forwarded-for": `198.51.100.${locale === "en" ? 181 : 183}`,
      },
    });
    const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
    try {
      const username = `limit${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
      const signup = await host.request.post("/api/auth/sign-up/email", {
        headers: { origin },
        data: {
          name: username,
          username,
          email: `${username}@example.test`,
          password: "test-password-123",
        },
      });
      expect(signup.status()).toBe(200);
      const h = await host.newPage();
      const g = await guest.newPage();
      await h.goto(`/${locale}`);
      await h.getByLabel(messages.roomName).fill("Rate limit acceptance");
      await h
        .getByRole("button", { name: messages.create, exact: true })
        .click();
      await expect(h.getByTestId("room-code")).toBeVisible();
      const code = await h.getByTestId("room-code").innerText();
      await g.goto(`/${locale}`);
      await g.getByLabel(messages.guestName).fill("Rate limit guest");
      await g
        .getByRole("button", { name: messages.guest, exact: true })
        .click();
      await expect(g.getByLabel(messages.code)).toBeVisible();
      for (let n = 0; n < 10; n++) {
        const refused = await guest.request.post("/api/lobbies/join", {
          headers: { origin },
          data: { code: "ZZZZZZ", role: "PARTICIPANT" },
        });
        expect(refused.status()).toBe(404);
      }
      for (const reload of [false, true]) {
        if (reload) await g.reload();
        await g.getByLabel(messages.code).fill(code);
        const reply = g.waitForResponse(
          (response) =>
            new URL(response.url()).pathname === "/api/lobbies/join" &&
            response.request().method() === "POST",
        );
        await g
          .getByRole("button", { name: messages.join, exact: true })
          .click();
        expect((await reply).status()).toBe(429);
        await expect(g.getByRole("main").getByRole("alert")).toHaveText(
          messages.errors.RATE_LIMITED,
        );
        await expect(g.getByTestId("room-code")).toHaveCount(0);
        await expect(h.getByTestId("member-row")).toHaveCount(1);
        expect(
          await (await guest.request.get("/api/lobbies/me")).json(),
        ).toEqual({ ok: true, value: null });
      }
    } finally {
      await host.close();
      await guest.close();
    }
  });
}
