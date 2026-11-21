"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/shared/presentation/i18n/navigation";
import { withReturnPath } from "@/shared/presentation/i18n/return-path";
import { buttonStyles } from "@/shared/presentation/ui/button";

// Client-side so the shared layouts can send visitors back to the page they were on.
export function AuthLinks() {
  const t = useTranslations();
  const pathname = usePathname();
  return (
    <div className="nav-account-controls">
      <Link
        href={withReturnPath("/login", pathname)}
        className={buttonStyles({ variant: "paper", size: "small" })}
      >
        {t("login")}
      </Link>
      <Link
        href={withReturnPath("/signup", pathname)}
        className={buttonStyles({ variant: "pink", size: "small" })}
      >
        {t("signup")}
      </Link>
    </div>
  );
}
