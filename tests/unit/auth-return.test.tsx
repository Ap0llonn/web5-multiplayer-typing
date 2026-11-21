import React from "react";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { getCurrentActor } from "@/modules/identity/server";
import { failure } from "@/shared/contracts/operation-result";
import { AuthPage } from "@/composition/auth/auth-page";
import en from "@/shared/presentation/i18n/messages/en.json";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/modules/identity/server", () => ({ getCurrentActor: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => createTranslator({ locale: "en", messages: en }),
}));
vi.mock("@/shared/presentation/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

async function render(mode: "login" | "signup", next: string) {
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "test-secret-at-least-thirty-two-characters",
  );
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.mocked(getCurrentActor).mockResolvedValue(failure("UNAUTHENTICATED"));
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      {await AuthPage({ mode, searchParams: Promise.resolve({ next }) })}
    </NextIntlClientProvider>,
  );
}

it("keeps a safe return path when switching between login and signup", async () => {
  expect(await render("login", "/play/create")).toContain(
    'href="/signup?next=%2Fplay%2Fcreate"',
  );
  expect(await render("signup", "/lobbies")).toContain(
    'href="/login?next=%2Flobbies"',
  );
});

it("drops an unsafe return path from the auth links", async () => {
  const html = await render("login", "//evil.example");
  expect(html).toContain('href="/signup"');
  expect(html).not.toContain("evil.example");
});
