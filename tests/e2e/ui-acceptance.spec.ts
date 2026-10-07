import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

async function fitsViewport(page: Page) {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    elements: [
      ...document.querySelectorAll(
        "main, form, input, select, button, h1, h2, li",
      ),
    ]
      .filter(
        (element) =>
          element.getBoundingClientRect().right > window.innerWidth + 1,
      )
      .map((element) => element.tagName),
  }));
  expect(
    overflow,
    `Horizontal overflow: ${JSON.stringify(overflow)}`,
  ).toMatchObject({ document: overflow.viewport, elements: [] });
}
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}

test("the supplied logo, navigation and footer stay usable and locale switching preserves the current URL", async ({
  page,
}) => {
  await page.goto("/fr/login?from=invite#content");
  const logos = page.getByRole("img", { name: fr.brandName, exact: true });
  await expect(logos).toHaveCount(2);
  for (const logo of await logos.all()) {
    await expect(logo).toBeVisible();
    await expect
      .poll(() =>
        logo.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/login\?from=invite#content$/);
  const footer = page.getByRole("contentinfo");
  await footer.getByRole("link", { name: en.signup, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/signup$/);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: en.home, exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    en.heroTitle,
  );
});

test("browser locale and system theme yield to persisted explicit preferences across routes", async ({
  browser,
}) => {
  const context = await browser.newContext({
    locale: "en-US",
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|did not match|server rendered html/i.test(message.text())
    )
      errors.push(message.text());
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Français", exact: true }).click();
    await expect(page).toHaveURL(/\/fr\/?$/);
    await page.getByRole("button", { name: fr.light, exact: true }).click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/light/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/fr\/?$/);
    for (const path of ["/fr", "/fr/login", "/fr/signup"]) {
      await page.goto(path);
      await expect(page).toHaveTitle(fr.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        fr.roomIntro,
      );
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      await expect(page.locator("html")).toHaveClass(/light/);
      await expect(
        page.getByRole("button", { name: "English", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: fr.dark, exact: true }),
      ).toBeVisible();
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
  const fallback = await browser.newContext({
    locale: "es-ES",
    colorScheme: "light",
  });
  try {
    const p = await fallback.newPage();
    await p.goto("/", { waitUntil: "domcontentloaded" });
    await expect(p).toHaveURL(/\/fr\/?$/);
    await expect(p.locator("html")).toHaveClass(/light/);
  } finally {
    await fallback.close();
  }
});

test("keyboard signup and a maximum-length room name remain usable at 360px", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 780 },
    extraHTTPHeaders: { "x-forwarded-for": "192.0.2.240" },
  });
  try {
    const page = await context.newPage();
    await page.goto("/en/signup");
    await fitsViewport(page);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: en.skip, exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(en.username)).toBeFocused();
    expect(
      await page
        .getByLabel(en.username)
        .evaluate((element) => getComputedStyle(element).outlineStyle),
    ).not.toBe("none");
    const username = `keyboard${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
    await page.keyboard.type(username);
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(en.email)).toBeFocused();
    await page.keyboard.type(`${username}@example.test`);
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(en.password, { exact: true })).toBeFocused();
    await page.keyboard.type("test-password-123");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: en.signup, exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/en\/?$/);
    await page.goto("/en/play/create");
    await expect(page.getByLabel(en.roomName)).toBeVisible();
    await fitsViewport(page);
    const longName = "W".repeat(60);
    await page.getByLabel(en.roomName).fill(longName);
    await page.getByRole("button", { name: en.create, exact: true }).click();
    await expect(page.getByTestId("room-code")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: longName, exact: true }),
    ).toBeVisible();
    await fitsViewport(page);
    await page.getByRole("button", { name: en.leave, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel(en.play.roomCodeLabel)).toBeVisible();
  } finally {
    await context.close();
  }
});

for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`${locale}/${theme}: existing pages, forms and room pass automated AA checks at 360px`, async ({
      browser,
    }) => {
      test.setTimeout(90000);
      const context = await browser.newContext({
        viewport: { width: 360, height: 780 },
        colorScheme: theme,
        extraHTTPHeaders: {
          "x-forwarded-for": `192.0.2.${(locale === "en" ? 241 : 243) + (theme === "dark" ? 1 : 0)}`,
        },
      });
      try {
        const page = await context.newPage();
        for (const suffix of ["", "/login", "/signup"]) {
          await page.goto(`/${locale}${suffix}`);
          await expect(page.locator("html")).toHaveClass(new RegExp(theme));
          await expect(page).toHaveTitle(messages.title);
          await expect(page.getByRole("main")).toHaveCount(1);
          await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
          await fitsViewport(page);
          await accessible(page);
        }
        const username = `a11y${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
        const signup = await context.request.post("/api/auth/sign-up/email", {
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
        await page.goto(`/${locale}/play/create`);
        await expect(page.getByLabel(messages.roomName)).toBeVisible();
        await fitsViewport(page);
        await accessible(page);
        await page.getByLabel(messages.roomName).fill("Accessible room");
        await page
          .getByRole("button", { name: messages.create, exact: true })
          .click();
        await expect(page.getByTestId("room-code")).toBeVisible();
        await fitsViewport(page);
        await accessible(page);
      } finally {
        await context.close();
      }
    });
  }
}
