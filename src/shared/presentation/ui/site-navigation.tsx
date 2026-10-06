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
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <Brand />
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
            {t("play.navigationLabel")}
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
