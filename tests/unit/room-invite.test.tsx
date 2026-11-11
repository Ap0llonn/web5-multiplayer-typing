import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { expect, it } from "vitest";
import { RoomInvite } from "@/modules/lobby/presentation/room/room-invite";
import fr from "@/shared/presentation/i18n/messages/fr.json";
import en from "@/shared/presentation/i18n/messages/en.json";
for (const [locale, messages] of [
  ["fr", fr],
  ["en", en],
] as const)
  it(`${locale}: explains single successful entry and offers generation`, () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <RoomInvite code="ABC234" />
      </NextIntlClientProvider>,
    );
    expect(html).toContain(messages.invites.create);
    expect(html).toContain(messages.invites.description);
    expect(html).not.toContain("#invite=");
  });
