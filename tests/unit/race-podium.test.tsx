import React from "react";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { RaceResults } from "@/modules/lobby/presentation/race/race-results";
import en from "@/shared/presentation/i18n/messages/en.json";
it("reveals third, second, then first while retaining the full ranking", () => {
  const players = [1, 2, 3, 4].map((rank) => ({
    playerIdentityId: `p${rank}`,
    displayName: `Player ${rank}`,
    rank,
    kind: "account" as const,
    character: "cobalt" as const,
    status: "FINISHED" as const,
    wpm: 40,
    grossWpm: 45,
    accuracy: 90,
    errors: 2,
    elapsedMs: 10000,
    bonusesReceived: 1,
  }));
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <RaceResults race={{ players }} />
    </NextIntlClientProvider>,
  );
  expect(html.indexOf('data-rank="3"')).toBeLessThan(
    html.indexOf('data-rank="2"'),
  );
  expect(html.indexOf('data-rank="2"')).toBeLessThan(
    html.indexOf('data-rank="1"'),
  );
  expect(html).toContain("animation-delay:8.4s");
  expect(html).toContain("Player 4");
  expect(html).not.toContain('href="/audio/credits.txt"');
  expect(html).toContain(en.race.stadiumLostIt);
  expect(html).toContain(en.race.totallyNecessary);
  expect(html.match(/--confetti-x:/g)).toHaveLength(96);
  expect(html).toContain("Player 1 takes the win!");
  expect(html).toContain('data-celebrating="true"');
  expect(html).toContain('class="podium-confetti" aria-hidden="true"');
  expect(html.match(/podium-crown/g)).toHaveLength(1);
});

it("does not celebrate a winner when every racer abandoned", () => {
  const players = [
    {
      playerIdentityId: "p1",
      displayName: "Player 1",
      rank: 1,
      kind: "account" as const,
      character: "cobalt" as const,
      status: "ABANDONED" as const,
      wpm: 0,
      grossWpm: 0,
      accuracy: 0,
      errors: 0,
      elapsedMs: 1000,
      bonusesReceived: 0,
    },
  ];
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <RaceResults race={{ players }} />
    </NextIntlClientProvider>,
  );
  expect(html).toContain('data-celebrating="false"');
  expect(html).not.toContain('class="podium-confetti"');
  expect(html).not.toContain("takes the win!");
});

it("shows archived statistics immediately without podium or celebration", () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <RaceResults
        race={{
          players: [
            {
              playerIdentityId: "p",
              displayName: "Winner",
              kind: "account",
              character: "cobalt",
              rank: 1,
              status: "FINISHED",
              wpm: 50,
              grossWpm: 55,
              accuracy: 95,
              errors: 1,
              elapsedMs: 10000,
              bonusesReceived: 0,
            },
          ],
        }}
        showPodium={false}
      />
    </NextIntlClientProvider>,
  );
  expect(html).toContain("<table>");
  expect(html).toContain("Winner");
  expect(html).toContain("animation:none");
  expect(html).not.toContain('class="podium-stage"');
  expect(html).not.toContain('class="podium-spotlight"');
  expect(html).not.toContain('class="podium-confetti"');
  expect(html).not.toContain(en.race.mutePodiumSound);
});
