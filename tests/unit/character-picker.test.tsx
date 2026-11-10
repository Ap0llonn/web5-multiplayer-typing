import React from "react";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { CharacterPicker } from "@/modules/lobby/presentation/characters/character-picker";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";
for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  it(`offers the photo only when available in ${locale}`, () => {
    const render = (available: boolean) =>
      renderToStaticMarkup(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <CharacterPicker
            character="cobalt"
            onChange={() => {}}
            hasProfilePhoto={available}
          />
        </NextIntlClientProvider>,
      );
    expect(render(false)).not.toContain('value="profile"');
    expect(render(true)).toContain('value="profile"');
    expect(render(true)).toContain(messages.play.characters.profile);
    expect(render(true)).toContain("/api/profile/photo");
  });
}
