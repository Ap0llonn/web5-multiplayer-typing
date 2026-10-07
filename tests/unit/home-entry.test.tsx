import React from "react";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { HomePage } from "@/composition/home/home-page";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

const state = vi.hoisted(() => ({ locale: "en" }));
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
  it(`${locale}: home explains joining and links to the dedicated join and host pages`, async () => {
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
    expect(html.match(/<a /g)).toHaveLength(2);
    expect(html.match(/<h1 /g)).toHaveLength(1);
    expect(html).toContain(messages.join);
    expect(html).toContain(messages.noAccountNeeded);
    expect(html).toContain(messages.create);
    expect(html).not.toContain("<img");
    expect(html).toContain(messages.heroTitle);
    const copy =
      locale === "fr"
        ? [
            "Comment rejoindre ?",
            "Entre le code",
            "Choisis ton personnage",
            "Retrouve la bande",
            "Envie de rassembler tes amis ?",
            "Un compte est nécessaire pour créer une salle.",
          ]
        : [
            "How do I join?",
            "Enter the code",
            "Pick your character",
            "Meet the crew",
            "Bringing your friends together?",
            "An account is required to create a room.",
          ];
    for (const text of copy) expect(html).toContain(text);
    expect(html.match(/<li[ >]/g)).toHaveLength(3);
  });
}
