"use client";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Link, usePathname, useRouter } from "../i18n/navigation";
export function Shell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const path = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  return (
    <>
      <a className="sr-only focus:not-sr-only" href="#content">
        {t("skip")}
      </a>
      <header>
        <nav aria-label={t("navigation")}>
          <Link href="/">{t("title")}</Link>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                router.replace(path, { locale: locale === "fr" ? "en" : "fr" })
              }
            >
              {locale === "fr" ? "English" : "Français"}
            </button>
            <button onClick={() => setTheme("light")}>{t("light")}</button>
            <button onClick={() => setTheme("dark")}>{t("dark")}</button>
          </div>
        </nav>
      </header>
      <main id="content">{children}</main>
      <footer>{t("checkpoint")}</footer>
    </>
  );
}
