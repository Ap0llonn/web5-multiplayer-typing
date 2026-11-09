import React from "react";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PlayLayout } from "@/composition/play/play-layout";
const navigation = vi.hoisted(() => ({ pathname: "/play" }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/composition/site/account-controls", () => ({
  getAccountControls: async () => null,
}));
vi.mock("@/shared/presentation/i18n/navigation", () => ({
  usePathname: () => navigation.pathname,
}));
vi.mock("@/shared/presentation/ui/site-navigation", () => ({
  SiteNavigation: () => <nav>Navigation</nav>,
}));
for (const pathname of ["/play/player", "/play/room", "/play/room/settings"]) {
  it(`${pathname}: keeps the main/skip target and removes site navigation`, async () => {
    navigation.pathname = pathname;
    const html = renderToStaticMarkup(
      await PlayLayout({ children: <h1>Lobby</h1> }),
    );
    expect(html).not.toContain("<nav");
    expect(html).toContain('id="content"');
    expect(html).toContain('href="#content"');
  });
}
for (const pathname of ["/play", "/play/create"]) {
  it(`${pathname}: entry pages retain site navigation`, async () => {
    navigation.pathname = pathname;
    expect(
      renderToStaticMarkup(await PlayLayout({ children: <h1>Entry</h1> })),
    ).toContain("<nav");
  });
}
