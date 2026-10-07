import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { getAccountControls } from "@/composition/site/account-controls";
import { SiteNavigation } from "@/shared/presentation/ui/site-navigation";
import "./play-layout.css";

export async function PlayLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();
  const accountControl = await getAccountControls();
  return (
    <div className="play-shell">
      <a className="skip-link" href="#content">
        {t("skip")}
      </a>
      <SiteNavigation accountControl={accountControl} />
      <main id="content" tabIndex={-1} className="play-main">
        {children}
      </main>
      <footer className="play-footer">{t("footerTagline")}</footer>
    </div>
  );
}
