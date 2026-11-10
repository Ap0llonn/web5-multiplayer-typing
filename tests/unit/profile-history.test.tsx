import React from "react";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { ProfileHistory } from "@/modules/lobby/presentation/race/profile-history";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

vi.mock("@/shared/presentation/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

for (const [locale, messages] of [
  ["fr", fr],
  ["en", en],
] as const) {
  it(`exposes saved race details in ${locale}`, () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
      >
        <ProfileHistory
          rows={[
            {
              raceId: "race",
              finishedAt: 10000,
              rank: 2,
              status: "FINISHED",
              wpm: 42,
              grossWpm: 48,
              accuracy: 90,
              errors: 7,
              elapsedMs: 12500,
            },
          ]}
        />
      </NextIntlClientProvider>,
    );
    expect(html).toContain("<details>");
    expect(html).toContain('href="/profile/races/race"');
    expect(html).toContain(messages.profile.raceDetails);
    expect(html).toContain(messages.profile.grossWpm);
    expect(html).toContain(messages.profile.errorsCount);
    expect(html).toContain("48");
    expect(html).toContain("<dd>7</dd>");
  });
}
