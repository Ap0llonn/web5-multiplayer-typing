"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Link, usePathname, useRouter } from "../i18n/navigation";
import { Brand } from "./brand";
import { Button } from "./button";
import { Icon } from "./icon";

export function SiteNavigation({
  accountControl,
}: {
  accountControl?: ReactNode;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const path = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
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
        </div>
        <div className="nav-controls">
          <Button
            variant="paper"
            size="small"
            aria-label={t(
              locale === "fr" ? "switchToEnglish" : "switchToFrench",
            )}
            onClick={() =>
              router.replace(
                `${path}${window.location.search}${window.location.hash}`,
                { locale: locale === "fr" ? "en" : "fr" },
              )
            }
          >
            <Icon name="globe" className="hidden sm:block" />
            <span>{t(locale === "fr" ? "localeFr" : "localeEn")}</span>
            <Icon name="chevron" className="h-4 w-4" />
          </Button>
          <div className="theme-controls">
            <Button
              variant="paper"
              size="small"
              aria-label={t("light")}
              title={t("light")}
              onClick={() => setTheme("light")}
              className="theme-light"
            >
              <Icon name="sun" />
            </Button>
            <Button
              variant="paper"
              size="small"
              aria-label={t("dark")}
              title={t("dark")}
              onClick={() => setTheme("dark")}
              className="theme-dark"
            >
              <Icon name="moon" />
            </Button>
          </div>
          {accountControl}
        </div>
      </nav>
    </header>
  );
}
