import React from "react";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { LobbyRoster } from "@/modules/lobby/presentation/room/lobby-roster";
import type { LobbySnapshot } from "@/modules/lobby/public";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";
const room: LobbySnapshot = {
  id: "room",
  code: "ABC234",
  name: "Room",
  capacity: 2,
  state: "WAITING",
  version: 1,
  hostPlayerIdentityId: "account",
  members: [
    {
      playerIdentityId: "account",
      kind: "account",
      displayName: "Alice",
      role: "SPECTATOR",
      character: "butter",
      joinedAt: 1,
      online: true,
    },
    {
      playerIdentityId: "guest",
      kind: "guest",
      displayName: "Bob",
      role: "PARTICIPANT",
      character: "mint",
      joinedAt: 2,
      online: false,
    },
  ],
};
for (const [locale, messages, accountLabel, guestLabel] of [
  ["en", en, "Account", "Guest"],
  ["fr", fr, "Compte", "Invité"],
] as const) {
  it(`renders distinct account/guest, host, role and presence labels in ${locale}`, () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
      >
        <LobbyRoster room={room} />
      </NextIntlClientProvider>,
    );
    const rows = [...html.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map(
      (match) => match[1],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain(accountLabel);
    expect(rows[0]).toContain('data-character="butter"');
    expect(rows[0]).toContain(messages.SPECTATOR);
    expect(rows[0]).toContain(messages.host);
    expect(rows[0]).toContain(messages.online);
    expect(rows[1]).toContain(guestLabel);
    expect(rows[1]).toContain('data-character="mint"');
    expect(rows[1]).toContain(messages.PARTICIPANT);
    expect(rows[1]).toContain(messages.offline);
    expect(rows[1]).not.toContain(messages.host);
  });
}
