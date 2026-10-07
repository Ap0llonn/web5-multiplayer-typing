import React from "react";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createFormatter,
  createTranslator,
  NextIntlClientProvider,
} from "next-intl";
import { getCurrentProfile } from "@/modules/identity/server";
import { ProfilePage } from "@/composition/profile/profile-page";
import { failure, success } from "@/shared/contracts/operation-result";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

const translations = vi.hoisted(() => ({ locale: "en" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/modules/identity/server", () => ({ getCurrentProfile: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: "profile") =>
    createTranslator({
      locale: translations.locale,
      messages: translations.locale === "fr" ? fr : en,
      ...(namespace ? { namespace } : {}),
    }),
  getFormatter: async () =>
    createFormatter({ locale: translations.locale, timeZone: "UTC" }),
}));
vi.mock("@/shared/presentation/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  it(`renders real account data and explicitly unavailable race statistics in ${locale}`, async () => {
    translations.locale = locale;
    vi.mocked(getCurrentProfile).mockResolvedValue(
      success({
        displayName: "Player",
        username: "original-login",
        joinedAt: Date.UTC(2026, 9, 7),
        photoVersion: null,
      }),
    );
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
      >
        {await ProfilePage()}
      </NextIntlClientProvider>,
    );
    expect(html).toContain("Player");
    expect(html).toContain("@original-login");
    expect(html).toContain(messages.profile.displayName);
    expect(html).toContain(messages.profile.statsUnavailable);
    expect(html).toContain(messages.profile.historyUnavailable);
    expect(html.match(/<dd/g)).toHaveLength(5);
    expect(html).toContain('type="file"');
  });
  it(`never exposes a form on guest, visitor or service failure in ${locale}`, async () => {
    translations.locale = locale;
    for (const code of ["FORBIDDEN", "UNAUTHENTICATED", "INTERNAL"] as const) {
      vi.mocked(getCurrentProfile).mockResolvedValue(failure(code));
      const html = renderToStaticMarkup(await ProfilePage());
      expect(html).not.toContain("<form");
      expect(html).not.toContain('type="file"');
      expect(html).toContain(
        code === "FORBIDDEN"
          ? messages.profile.guestNotice
          : code === "UNAUTHENTICATED"
            ? messages.profile.signInNotice
            : messages.errors.INTERNAL,
      );
      if (code === "INTERNAL") expect(html).toContain('role="alert"');
    }
  });
}
