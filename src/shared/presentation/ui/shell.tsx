"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SiteNavigation } from "./site-navigation";
import { SiteFooter } from "./site-footer";
export function Shell({
  children,
  accountControl,
}: {
  children: ReactNode;
  accountControl?: ReactNode;
}) {
  const t = useTranslations();
  return (
    <div className="site-shell">
      <a className="skip-link" href="#content">
        {t("skip")}
      </a>
      <SiteNavigation accountControl={accountControl} />
      <main id="content" tabIndex={-1} className="site-container site-main">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
