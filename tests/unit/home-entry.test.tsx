import React from "react";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { HomePage } from "@/composition/home/home-page";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

const state = vi.hoisted(() => ({ locale: "en" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/modules/identity/server", () => ({
  getCurrentActor: async () => ({
    ok: true,
    value: { kind: "account", playerIdentityId: "host", displayName: "Host" },
  }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () =>
    createTranslator({
      locale: state.locale,
      messages: state.locale === "fr" ? fr : en,
    }),
}));
vi.mock("@/shared/presentation/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
for (const [locale, messages] of [
  ["fr", fr],
  ["en", en],
] as const) {
  it(`${locale}: home introduces rooms and links to dedicated entries without forms`, async () => {
    state.locale = locale;
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
      >
        {await HomePage()}
      </NextIntlClientProvider>,
    );
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("member-row");
    expect(html).toContain('href="/play"');
    expect(html).toContain('href="/play/create"');
    expect(html).toContain(messages.heroTitle);
  });
}
