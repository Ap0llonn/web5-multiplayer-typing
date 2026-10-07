import React from "react";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { SiteLayout } from "@/composition/site/site-layout";
import { PlayLayout } from "@/composition/play/play-layout";
import { getCurrentActor } from "@/modules/identity/server";
import { failure, success } from "@/shared/contracts/operation-result";
import en from "@/shared/presentation/i18n/messages/en.json";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/modules/identity/server", () => ({ getCurrentActor: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => createTranslator({ locale: "en", messages: en }),
}));
vi.mock("@/shared/presentation/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme: vi.fn(), resolvedTheme: undefined }),
}));

for (const Layout of [SiteLayout, PlayLayout]) {
  async function render() {
    return (
      renderToStaticMarkup(
        <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
          {await Layout({ children: <h1>Content</h1> })}
        </NextIntlClientProvider>,
      ).match(/<header[\s\S]*?<\/header>/)?.[0] ?? ""
    );
  }
  it(`${Layout.name}: signed-out visitors can sign in or create an account from the navigation`, async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(failure("UNAUTHENTICATED"));
    const html = await render();
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/signup"');
    expect(html).not.toContain(en.logout);
  });
  it(`${Layout.name}: accounts retain profile and sign-out without signed-out actions`, async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(
      success({
        kind: "account",
        playerIdentityId: "account",
        displayName: "Account",
      }),
    );
    const html = await render();
    expect(html).toContain('href="/profile"');
    expect(html).toContain(en.logout);
    expect(html).not.toContain('href="/login"');
    expect(html).not.toContain('href="/signup"');
  });
  it(`${Layout.name}: guests keep sign-out and identity failures do not imply signed-out state`, async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(
      success({
        kind: "guest",
        playerIdentityId: "guest",
        displayName: "Guest",
      }),
    );
    expect(await render()).toContain(en.logout);
    vi.mocked(getCurrentActor).mockResolvedValue(failure("INTERNAL"));
    const html = await render();
    expect(html).not.toContain('href="/login"');
    expect(html).not.toContain('href="/signup"');
    expect(html).not.toContain(en.logout);
  });
}
