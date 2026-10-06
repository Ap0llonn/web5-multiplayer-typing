"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "../i18n/navigation";
import { Button } from "./button";
import { Icon } from "./icon";

export function LanguageSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const path = usePathname();
  const router = useRouter();

  return (
    <Button
      variant="paper"
      size="small"
      aria-label={t(locale === "fr" ? "switchToEnglish" : "switchToFrench")}
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
  );
}
