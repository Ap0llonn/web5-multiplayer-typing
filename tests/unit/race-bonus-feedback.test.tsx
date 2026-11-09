import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { selectBonusFeedback } from "@/modules/lobby/presentation/race/bonus-feedback";
import { RaceBonusFeedback } from "@/modules/lobby/presentation/race/race-bonus-feedback";
import type { RaceBonusEvent, RaceItemType } from "@/modules/lobby/public";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

const event = (
  type: RaceItemType,
  overrides: Partial<RaceBonusEvent> = {},
): RaceBonusEvent => ({
  id: `${type}:used`,
  type,
  actorId: "attacker",
  targetId: "target",
  outcome: "applied",
  at: 5000,
  ...overrides,
});
describe("authoritative bonus feedback", () => {
  it("shows applied effects only to the target and sender, while lane feedback remains available to observers", () => {
    const events = [event("fog")];
    expect(selectBonusFeedback(events, "target", 5500)).toMatchObject([
      { role: "target", effect: "fog" },
    ]);
    expect(selectBonusFeedback(events, "attacker", 5500)).toMatchObject([
      { role: "sender", effect: "fog" },
    ]);
    expect(selectBonusFeedback(events, "spectator", 5500)).toEqual([]);
  });
  it("does not celebrate receipt, old events, future events or duplicate transport frames", () => {
    const applied = event("shortcut", { actorId: "target" });
    expect(
      selectBonusFeedback([applied, applied], "target", 5500),
    ).toHaveLength(1);
    expect(
      selectBonusFeedback(
        [event("fog", { outcome: "received" })],
        "target",
        5500,
      ),
    ).toEqual([]);
    expect(selectBonusFeedback([applied], "target", 10000)).toEqual([]);
    expect(selectBonusFeedback([applied], "target", 4999)).toEqual([]);
  });
  it("shows a shield impact instead of a successful debuff when the attack was blocked", () => {
    expect(
      selectBonusFeedback(
        [event("fog", { outcome: "blocked" })],
        "target",
        5500,
      ),
    ).toMatchObject([{ effect: "blocked", role: "target" }]);
  });
  for (const [locale, messages] of [
    ["fr", fr],
    ["en", en],
  ] as const) {
    it(`${locale}: renders seven distinct decorative effects and persistent server-timed fog/shield`, () => {
      for (const type of [
        "shortcut",
        "detour",
        "fog",
        "shield",
        "clear",
        "nudge",
        "catchup",
      ] as const) {
        const html = renderToStaticMarkup(
          <NextIntlClientProvider
            locale={locale}
            messages={messages}
            timeZone="UTC"
          >
            <RaceBonusFeedback
              events={[event(type)]}
              playerIdentityId="target"
              now={5500}
              fogUntil={9000}
              shield
            />
          </NextIntlClientProvider>,
        );
        expect(html).toContain(`data-bonus-visual="${type}"`);
        expect(html).toContain('data-atmosphere="fog"');
        expect(html).toContain('data-atmosphere="shield"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).not.toContain("<button");
      }
    });
    it(`${locale}: clears persistent fog at its server deadline and avoids replaying old effects after reload`, () => {
      const html = renderToStaticMarkup(
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone="UTC"
        >
          <RaceBonusFeedback
            events={[event("fog")]}
            playerIdentityId="target"
            now={10000}
            fogUntil={9000}
            shield={false}
          />
        </NextIntlClientProvider>,
      );
      expect(html).not.toContain('data-atmosphere="fog"');
      expect(html).not.toContain('data-bonus-visual="fog"');
    });
  }
});

it("drops the old fog/shield celebration immediately when clear or block supersedes that state", () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <RaceBonusFeedback
        events={[
          event("fog"),
          event("shield", { id: "shield:used", at: 5100 }),
        ]}
        playerIdentityId="target"
        now={5200}
        fogUntil={null}
        shield={false}
      />
    </NextIntlClientProvider>,
  );
  expect(html).not.toContain('data-bonus-visual="fog"');
  expect(html).not.toContain('data-bonus-visual="shield"');
});
