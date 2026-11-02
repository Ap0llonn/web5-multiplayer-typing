import React from "react";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { JoinPlayerForm } from "@/composition/play/join-player-form";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";
vi.mock("@/shared/presentation/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/modules/identity/presentation/auth-form", () => ({
  AuthForm: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));
for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  for (const signedIn of [false, true]) {
    it(`${locale}: ${signedIn ? "account" : "guest"} can select spectator before joining`, () => {
      const html = renderToStaticMarkup(
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone="UTC"
        >
          <JoinPlayerForm
            code="ABC234"
            actor={
              signedIn
                ? {
                    playerIdentityId: "player",
                    kind: "account",
                    displayName: "Player",
                  }
                : null
            }
          />
        </NextIntlClientProvider>,
      );
      expect(html).toContain('name="role"');
      expect(html).toContain('value="SPECTATOR"');
      expect(html).toContain(messages.SPECTATOR);
    });
  }
}
