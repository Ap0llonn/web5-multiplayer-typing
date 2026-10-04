import React from "react";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { Shell } from "@/shared/presentation/ui/shell";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

vi.mock("@/shared/presentation/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme: vi.fn(), resolvedTheme: undefined }),
}));

for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  it(`provides a skip target, labelled navigation and working footer links in ${locale}`, () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
      >
        <Shell>
          <h1>{messages.title}</h1>
        </Shell>
      </NextIntlClientProvider>,
    );
    expect(html).toContain('href="#content"');
    expect(html).toContain('id="content"');
    expect(html).toContain('tabindex="-1"');
    expect(html.match(/<main/g)).toHaveLength(1);
    expect(html).toContain(`aria-label="${messages.navigation}"`);
    const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0];
    expect(footer).toContain('href="/login"');
    expect(footer).toContain('href="/signup"');
    expect(footer).toContain(messages.login);
    expect(footer).toContain(messages.signup);
  });
}
