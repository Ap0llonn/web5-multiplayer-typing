import type { ReactNode } from "react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { SignOutButton } from "@/modules/identity/presentation/sign-out-button";
import { Link } from "@/shared/presentation/i18n/navigation";
import { Brand } from "@/shared/presentation/ui/brand";
import { LanguageSwitcher } from "@/shared/presentation/ui/language-switcher";
import { ThemeSwitcher } from "@/shared/presentation/ui/theme-switcher";
import "./play-layout.css";

export async function PlayLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();
  const actor = await getCurrentActor(await headers());
  return (
    <div className="play-shell">
      <a className="skip-link" href="#content">
        {t("skip")}
      </a>
      <header className="play-header">
        <Brand compact />
        <nav className="play-header-controls" aria-label={t("navigation")}>
          <LanguageSwitcher />
          <ThemeSwitcher />
          {actor.ok ? (
            <SignOutButton />
          ) : actor.error.code === "UNAUTHENTICATED" ? (
            <Link href="/login" className="text-sm font-bold underline">
              {t("login")}
            </Link>
          ) : null}
        </nav>
      </header>
      <main id="content" tabIndex={-1} className="play-main">
        {children}
      </main>
      <footer className="play-footer">{t("footerTagline")}</footer>
    </div>
  );
}
