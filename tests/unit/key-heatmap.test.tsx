import React from "react";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { KeyHeatmap } from "@/modules/lobby/presentation/race/key-heatmap";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

for (const [locale, messages] of [
  ["fr", fr],
  ["en", en],
] as const) {
  it(`${locale}: renders both modes, accented keys, space and numeric accessible details`, () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <KeyHeatmap
          statistics={[
            { key: "é", total: 4, errors: 1 },
            { key: " ", total: 2, errors: 0 },
          ]}
          races={2}
        />
      </NextIntlClientProvider>,
    );
    expect(html).toContain('role="group"');
    expect(html).toContain(messages.heatmap.frequency);
    expect(html).toContain(messages.heatmap.errors);
    expect(html).toContain("é");
    expect(html).toContain(messages.heatmap.space);
    expect(html).toContain("75");
    expect(html).not.toContain(messages.heatmap.empty);
  });
  it(`${locale}: explains missing historical data`, () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <KeyHeatmap statistics={[]} races={0} />
      </NextIntlClientProvider>,
    );
    expect(html).toContain(messages.heatmap.empty);
  });
}
