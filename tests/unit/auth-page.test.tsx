import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { getCurrentActor } from "@/modules/identity/server";
import { failure } from "@/shared/contracts/operation-result";
import { AuthPage } from "@/composition/auth/auth-page";
import { HomePage } from "@/composition/home/home-page";
import { CreatePage } from "@/composition/play/create-page";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

const translations = vi.hoisted(() => ({ locale: "en" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/modules/identity/server", () => ({ getCurrentActor: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () =>
    createTranslator({
      locale: translations.locale,
      messages: translations.locale === "fr" ? fr : en,
    }),
}));
vi.mock("@/shared/presentation/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
afterEach(() => vi.unstubAllEnvs());

for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  it(`offers a join CTA without room creation in ${locale}`, async () => {
    translations.locale = locale;
    vi.mocked(getCurrentActor).mockResolvedValue(failure("UNAUTHENTICATED"));
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
      >
        {await HomePage()}
      </NextIntlClientProvider>,
    );
    expect(html).toContain('aria-labelledby="home-title"');
    expect(html).toContain(messages.join);
    expect(html).not.toContain(messages.create);
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
  });
}

for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  for (const mode of ["login", "signup"] as const) {
    it(`renders a translated failure instead of crashing ${mode} in ${locale} when authentication is unavailable`, async () => {
      translations.locale = locale;
      vi.stubEnv("BETTER_AUTH_SECRET", "");
      vi.mocked(getCurrentActor).mockResolvedValue(failure("INTERNAL"));
      const html = renderToStaticMarkup(await AuthPage({ mode }));
      expect(html).toContain('role="alert"');
      expect(html).toContain(messages.errors.INTERNAL);
      expect(html).not.toContain("<form");
      expect(html).not.toContain("Invalid server configuration");
      expect(html).not.toContain("BETTER_AUTH_SECRET");
    });
  }
}

for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  it(`does not offer room creation in ${locale} when the server is unavailable`, async () => {
    translations.locale = locale;
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.mocked(getCurrentActor).mockResolvedValue(failure("INTERNAL"));
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
      >
        {await CreatePage()}
      </NextIntlClientProvider>,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain(messages.errors.INTERNAL);
    expect(html).not.toContain("<form");
  });
}
