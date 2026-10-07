"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "../i18n/navigation";
import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";

export function SiteNavigation({
  accountControl,
}: {
  accountControl?: ReactNode;
}) {
  const t = useTranslations();
  const path = usePathname();
  return (
    <header className="site-header">
      <nav
        className="site-container site-navigation"
        aria-label={t("navigation")}
      >
        <Brand />
        <div className="nav-links">
          <Link
            className="nav-home"
            href="/"
            aria-current={path === "/" ? "page" : undefined}
          >
            {t("home")}
          </Link>
          <Link
            className="nav-home"
            href="/play"
            aria-current={path === "/play" ? "page" : undefined}
          >
            {t("siteNav.join")}
          </Link>
          <Link
            className="nav-home"
            href="/lobbies"
            aria-current={path === "/lobbies" ? "page" : undefined}
          >
            {t("siteNav.seeLobbies")}
          </Link>
          <Link
            className="nav-home"
            href="/play/create"
            aria-current={path === "/play/create" ? "page" : undefined}
          >
            {t("siteNav.createRace")}
          </Link>
        </div>
        <div className="nav-controls">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {accountControl}
        </div>
      </nav>
    </header>
  );
}
