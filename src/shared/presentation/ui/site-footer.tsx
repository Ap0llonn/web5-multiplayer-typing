import { useTranslations } from "next-intl";
import { Link } from "../i18n/navigation";
import { Brand } from "./brand";

export function SiteFooter() {
  const t = useTranslations();
  return (
    <footer className="site-footer">
      <div className="site-container flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Brand compact />
          <p className="footer-tagline">{t("footerTagline")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-bold">
          <Link href="/">{t("home")}</Link>
          <Link href="/login">{t("login")}</Link>
          <Link href="/signup">{t("signup")}</Link>
        </div>
      </div>
    </footer>
  );
}
