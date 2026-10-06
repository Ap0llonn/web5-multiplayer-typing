import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { RoomPreviewProvider } from "@/modules/lobby/presentation/room-preview-provider";
import { Brand } from "@/shared/presentation/ui/brand";
import { LanguageSwitcher } from "@/shared/presentation/ui/language-switcher";
import { ThemeSwitcher } from "@/shared/presentation/ui/theme-switcher";
import "@/shared/presentation/styles/play-preview.css";

export function PlayLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("playPreview");
  const common = useTranslations();
  return (
    <RoomPreviewProvider>
      <div className="pp-shell">
        <a className="skip-link" href="#content">
          {common("skip")}
        </a>
        <header className="pp-header">
          <Brand compact />
          <span className="pp-demo-label">{t("prototypeBadge")}</span>
          <nav className="pp-header-controls" aria-label={common("navigation")}>
            <LanguageSwitcher />
            <ThemeSwitcher />
          </nav>
        </header>
        <main id="content" tabIndex={-1} className="pp-main">
          {children}
        </main>
        <footer className="pp-footer">{t("prototypeNote")}</footer>
      </div>
    </RoomPreviewProvider>
  );
}
