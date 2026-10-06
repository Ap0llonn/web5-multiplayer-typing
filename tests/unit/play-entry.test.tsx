import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { PlayPage } from "@/composition/play/play-page";
import { getCurrentActor } from "@/modules/identity/server";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

const state = vi.hoisted(() => ({ locale: "fr" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/modules/identity/server", () => ({ getCurrentActor: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () =>
    createTranslator({
      locale: state.locale,
      messages: state.locale === "fr" ? fr : en,
    }),
}));
vi.mock("@/shared/presentation/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentActor).mockResolvedValue({
    ok: true,
    value: {
      playerIdentityId: "account",
      kind: "account",
      displayName: "Host",
    },
  });
});

for (const [locale, messages] of [
  ["fr", fr],
  ["en", en],
] as const) {
  it(`${locale}: play offers only a six-character room code, including for accounts`, async () => {
    state.locale = locale;
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
      >
        <PlayPage />
      </NextIntlClientProvider>,
    );
    expect(html.match(/<form/g)).toHaveLength(1);
    expect(html.match(/<input/g)).toHaveLength(1);
    expect(html).toContain('name="code"');
    expect(html).toContain(messages.play.roomCodeLabel);
    expect(html).not.toContain('name="name"');
    expect(html).not.toContain('name="capacity"');
    expect(html).not.toContain(messages.create);
    expect(html).not.toMatch(/démo|demo|preview/i);
    expect(getCurrentActor).not.toHaveBeenCalled();
  });
}
