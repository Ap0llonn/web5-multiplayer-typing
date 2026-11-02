import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";
import { success, failure } from "@/shared/contracts/operation-result";
import { getPublicLobbies } from "@/composition/lobby/http";

const translations = vi.hoisted(() => ({ locale: "en" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/composition/lobby/http", () => ({ getPublicLobbies: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () =>
    createTranslator({
      locale: translations.locale,
      messages: translations.locale === "fr" ? fr : en,
    }),
}));
vi.mock("@/shared/presentation/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
beforeEach(() => vi.clearAllMocks());
async function render(locale: string) {
  translations.locale = locale;
  const { LobbiesPage } = await import("@/composition/lobby/lobbies-page");
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "fr" ? fr : en}
      timeZone="UTC"
    >
      {await LobbiesPage()}
    </NextIntlClientProvider>,
  );
}
for (const locale of ["en", "fr"]) {
  it(`${locale}: shows real public rooms and localized join links`, async () => {
    vi.mocked(getPublicLobbies).mockResolvedValue(
      success([
        {
          code: "ABC234",
          name: "Public crew",
          capacity: 8,
          participantCount: 2,
          spectatorCount: 1,
          hostName: "Host",
          state: "WAITING",
        },
      ]),
    );
    const html = await render(locale);
    expect(html).toContain("Public crew");
    expect(html).toContain("Host");
    expect(html).toContain('href="/play/player?code=ABC234"');
    expect(html).not.toMatch(/Coming soon|Bientôt disponible/);
  });
  it(`${locale}: distinguishes empty results from failures`, async () => {
    vi.mocked(getPublicLobbies).mockResolvedValue(success([]));
    const empty = await render(locale);
    expect(empty).toContain(
      locale === "en" ? "No public lobbies" : "Aucun salon public",
    );
    expect(empty).toContain('href="/play/create"');
    vi.mocked(getPublicLobbies).mockResolvedValue(failure("INTERNAL"));
    const failed = await render(locale);
    expect(failed).toContain('role="alert"');
    expect(failed).not.toContain(
      locale === "en" ? "No public lobbies" : "Aucun salon public",
    );
  });
}
