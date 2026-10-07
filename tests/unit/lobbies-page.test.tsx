import React from "react";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

const translations = vi.hoisted(() => ({ locale: "en" }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () =>
    createTranslator({
      locale: translations.locale,
      messages: translations.locale === "fr" ? fr : en,
    }),
}));
vi.mock("@/shared/presentation/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

for (const locale of ["en", "fr"]) {
  it(`${locale}: browsing is explicitly unavailable with real join and create alternatives`, async () => {
    translations.locale = locale;
    const { LobbiesPage } = await import("@/composition/lobby/lobbies-page");
    const html = renderToStaticMarkup(await LobbiesPage());
    expect(html).toContain(
      locale === "en" ? "Coming soon" : "Bientôt disponible",
    );
    expect(html).toContain('href="/play"');
    expect(html).toContain('href="/play/create"');
    expect(html).not.toContain("<table");
    expect(html).not.toContain("<form");
  });
}
