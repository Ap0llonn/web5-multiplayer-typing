import { expect, test, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

// Session cookies must not be retained in browser network traces.
test.use({ trace: "off" });

async function createAccount(context: BrowserContext) {
  const username = `select${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const response = await context.request.post("/api/auth/sign-up/email", {
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
  expect(response.status()).toBe(200);
}

// A11Y-02/04 and SALLE-05: custom role controls keep native form semantics.
test("role menus support keyboard selection, cancellation and independent form values", async ({
  browser,
}) => {
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "192.0.2.180" },
  });
  try {
    await createAccount(context);
    const page = await context.newPage();
    await page.goto("/en");
    await expect(
      page.getByRole("combobox", { name: en.role, exact: true }),
    ).toHaveCount(2);
    const createForm = page.locator("form").filter({
      has: page.getByRole("heading", { name: en.create, exact: true }),
    });
    const joinForm = page.locator("form").filter({
      has: page.getByRole("heading", { name: en.join, exact: true }),
    });
    const createRole = createForm.getByRole("combobox", {
      name: en.role,
      exact: true,
    });
    const joinRole = joinForm.getByRole("combobox", {
      name: en.role,
      exact: true,
    });
    await expect(createRole).toHaveAttribute("aria-expanded", "false");
    await expect(createRole).toContainText(en.PARTICIPANT);
    await createRole.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("listbox", { name: en.role, exact: true });
    await expect(menu).toBeVisible();
    await expect(createRole).toBeFocused();
    await expect(createRole).toHaveAttribute("aria-expanded", "true");
    const menuId = await menu.getAttribute("id");
    if (!menuId) throw new Error("The role listbox must have an id.");
    await expect(createRole).toHaveAttribute("aria-controls", menuId);
    await expect(
      menu.getByRole("option", { name: en.PARTICIPANT, exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    const spectatorId = await menu
      .getByRole("option", { name: en.SPECTATOR, exact: true })
      .getAttribute("id");
    if (!spectatorId)
      throw new Error("The active role option must have an id.");
    await expect(createRole).toHaveAttribute(
      "aria-activedescendant",
      spectatorId,
    );
    await page.keyboard.press("Enter");
    await expect(menu).toBeHidden();
    await expect(createRole).toBeFocused();
    await expect(createRole).toContainText(en.SPECTATOR);
    await expect(joinRole).toContainText(en.PARTICIPANT);

    await page.keyboard.press("Space");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Home");
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(createRole).toBeFocused();
    await expect(createRole).toContainText(en.SPECTATOR);

    await createRole.click();
    await expect(menu).toBeVisible();
    await createForm
      .getByRole("heading", { name: en.create, exact: true })
      .click();
    await expect(menu).toBeHidden();
    await expect(createRole).toHaveAttribute("aria-expanded", "false");

    await createRole.focus();
    await page.keyboard.press("Space");
    await expect(menu).toBeVisible();
    await page.keyboard.press("p");
    await page.keyboard.press("Tab");
    await expect(menu).toBeHidden();
    await expect(createRole).toContainText(en.PARTICIPANT);
    await expect(
      createForm.getByRole("button", { name: en.create, exact: true }),
    ).toBeFocused();

    await joinRole.click();
    await expect(menu).toBeVisible();
    expect(await menu.getAttribute("id")).not.toBe(menuId);
    await menu.getByRole("option", { name: en.SPECTATOR, exact: true }).click();
    await expect(joinRole).toBeFocused();
    await expect(joinRole).toContainText(en.SPECTATOR);
    await expect(createRole).toContainText(en.PARTICIPANT);
    await createRole.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(createRole).toContainText(en.SPECTATOR);

    await createForm.getByLabel(en.roomName).fill("Keyboard spectator");
    await createForm
      .getByRole("button", { name: en.create, exact: true })
      .click();
    await expect(page.getByTestId("room-code")).toBeVisible();
    expect(
      await (await context.request.get("/api/lobbies/me")).json(),
    ).toMatchObject({
      ok: true,
      value: { members: [{ role: "SPECTATOR" }] },
    });
  } finally {
    await context.close();
  }
});

test("role values and chevrons remain inside their controls at tablet widths", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 820, height: 900 },
    extraHTTPHeaders: { "x-forwarded-for": "192.0.2.185" },
  });
  try {
    await createAccount(context);
    const page = await context.newPage();
    for (const [locale, messages] of [
      ["fr", fr],
      ["en", en],
    ] as const) {
      await page.goto(`/${locale}`);
      for (const width of [820, 768, 900]) {
        await page.setViewportSize({ width, height: 900 });
        for (const control of await page
          .getByRole("combobox", { name: messages.role, exact: true })
          .all()) {
          await control.scrollIntoViewIfNeeded();
          const geometry = await control.evaluate((element) => {
            const outer = element.getBoundingClientRect();
            const children = [...element.children].map((child) => {
              const bounds = child.getBoundingClientRect();
              return {
                element: child.tagName,
                left: bounds.left - outer.left,
                right: bounds.right - outer.left,
                width: bounds.width,
              };
            });
            return { width: outer.width, children };
          });
          expect
            .soft(
              geometry.children.filter(
                (child) =>
                  child.left < -1 ||
                  child.right > geometry.width + 1 ||
                  child.width === 0,
              ),
              `${locale}/${width}: role value and chevron must fit ${JSON.stringify(geometry)}`,
            )
            .toEqual([]);
          await control.click();
          const menu = page.getByRole("listbox", {
            name: messages.role,
            exact: true,
          });
          await expect(menu).toBeVisible();
          const bounds = await menu.boundingBox();
          if (!bounds)
            throw new Error("The open role menu must have visible bounds.");
          expect.soft(bounds.x).toBeGreaterThanOrEqual(0);
          expect.soft(bounds.x + bounds.width).toBeLessThanOrEqual(width);
          expect.soft(bounds.y).toBeGreaterThanOrEqual(0);
          expect.soft(bounds.y + bounds.height).toBeLessThanOrEqual(900);
          await control.press("Escape");
        }
      }
    }
  } finally {
    await context.close();
  }
});

for (const [locale, messages] of [
  ["fr", fr],
  ["en", en],
] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`${locale}/${theme}: an open role menu is accessible at 360px and submits the selected role`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width: 360, height: 780 },
        colorScheme: theme,
        extraHTTPHeaders: {
          "x-forwarded-for": `192.0.2.${(locale === "fr" ? 181 : 183) + (theme === "dark" ? 1 : 0)}`,
        },
      });
      try {
        await createAccount(context);
        const page = await context.newPage();
        await page.goto(`/${locale}`);
        await expect(page.locator("html")).toHaveClass(new RegExp(theme));
        const form = page.locator("form").filter({
          has: page.getByRole("heading", {
            name: messages.create,
            exact: true,
          }),
        });
        await form.getByLabel(messages.roomName).fill("Mobile spectator");
        const role = form.getByRole("combobox", {
          name: messages.role,
          exact: true,
        });
        await role.click();
        const menu = page.getByRole("listbox", {
          name: messages.role,
          exact: true,
        });
        await expect(menu).toBeVisible();
        await expect(menu.getByRole("option")).toHaveCount(2);
        const bounds = await menu.boundingBox();
        if (!bounds)
          throw new Error("The open role menu must have visible bounds.");
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(780);
        const accessibility = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(
          accessibility.violations.map((violation) => ({
            id: violation.id,
            targets: violation.nodes.map((node) => node.target),
          })),
        ).toEqual([]);
        if (theme === "dark") {
          await role.press("End");
          await role.press("Enter");
        } else {
          await menu
            .getByRole("option", { name: messages.SPECTATOR, exact: true })
            .click();
        }
        await expect(menu).toBeHidden();
        await expect(role).toContainText(messages.SPECTATOR);
        await form
          .getByRole("button", { name: messages.create, exact: true })
          .click();
        await expect(page.getByTestId("room-code")).toBeVisible();
        await expect(page.getByTestId("member-row")).toContainText(
          messages.SPECTATOR,
        );
        expect(
          await (await context.request.get("/api/lobbies/me")).json(),
        ).toMatchObject({
          ok: true,
          value: { members: [{ role: "SPECTATOR" }] },
        });
      } finally {
        await context.close();
      }
    });
  }
}
