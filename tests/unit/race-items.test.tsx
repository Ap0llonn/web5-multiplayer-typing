import React from "react";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { RaceBonusLog } from "@/modules/lobby/presentation/race/race-bonus-log";
import { RacePassage } from "@/modules/lobby/presentation/race/race-passage";
import { RaceTrack } from "@/modules/lobby/presentation/race/race-track";
import { createRoom, joinRoom } from "@/modules/lobby/domain/lobby-rules";
import {
  startRace,
  raceSnapshot,
  useRaceItem,
} from "@/modules/lobby/domain/race-rules";
import type { RaceItemType } from "@/modules/lobby/contracts/race";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

const host = {
  playerIdentityId: "host",
  kind: "account" as const,
  displayName: "Host",
};
const guest = {
  playerIdentityId: "guest",
  kind: "guest" as const,
  displayName: "Guest",
};
function fixture() {
  const room = createRoom(
    { name: "Race", capacity: 2, role: "PARTICIPANT" },
    host,
    "ABC234",
    0,
  );
  if (!room.ok) throw Error("room");
  joinRoom(room.value, guest, "PARTICIPANT", 0);
  startRace(room.value, host, "alpha bravo charlie delta echo", "race", 0);
  if (!room.value.race) throw Error("race");
  const owner = room.value.race.players[1];
  owner.items = (
    [
      "shortcut",
      "detour",
      "fog",
      "shield",
      "clear",
      "nudge",
    ] satisfies RaceItemType[]
  ).map((type, index) => ({
    id: `${index}`,
    type,
    checkpoint: 25,
    receivedAt: 4000,
    usedAt: null,
  }));
  return room.value;
}
for (const [locale, messages] of [
  ["fr", fr],
  ["en", en],
] as const) {
  it(`${locale}: keeps bonus announcements accessible without a visible inventory or activation controls`, () => {
    const room = fixture();
    useRaceItem(room, guest, { raceId: "race", itemId: "0" }, 5000);
    const race = raceSnapshot(room, 5000, "guest");
    if (!race) throw Error("snapshot");
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
      >
        <RaceTrack race={race} playerIdentityId="guest" />
        <RaceBonusLog race={race} playerIdentityId="guest" />
      </NextIntlClientProvider>,
    );
    expect(html).not.toContain(messages.race.items.title);
    expect(html).not.toContain("data-item=");
    expect(html).not.toContain("<button");
    expect(html).toContain('class="sr-only"');
    expect(html).toContain('role="log"');
    expect(html).toContain('data-checkpoint="25"');
    expect(html).toContain('data-checkpoint="50"');
    expect(html).toContain('data-checkpoint="75"');
    expect(html).toContain('aria-valuenow="0"');
    const spectator = { ...race, self: null };
    const observerHtml = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
      >
        <RaceBonusLog race={spectator} playerIdentityId="watcher" />
      </NextIntlClientProvider>,
    );
    expect(observerHtml).not.toContain("data-item=");
  });
  it(`${locale}: fog hides future letters while leaving the current word and cursor readable`, () => {
    const render = (fog: boolean) =>
      renderToStaticMarkup(
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone="UTC"
        >
          <RacePassage
            text="alpha bravo charlie"
            draft="alp"
            language="en"
            fog={fog}
          />
        </NextIntlClientProvider>,
      );
    const fog = render(true);
    expect(fog).toContain('data-fogged="true"');
    expect(fog).toContain('data-cursor="true"');
    expect(fog).toContain("•");
    expect(fog).not.toMatch(/>b<|>v<|>c</);
    expect(render(false)).not.toContain("•");
  });
}
