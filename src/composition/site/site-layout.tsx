import type { ReactNode } from "react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { SignOutButton } from "@/modules/identity/presentation/sign-out-button";
import { Link } from "@/shared/presentation/i18n/navigation";
import { Shell } from "@/shared/presentation/ui/shell";
import { buttonStyles } from "@/shared/presentation/ui/button";
import { Icon } from "@/shared/presentation/ui/icon";

export async function SiteLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();
  const actor = await getCurrentActor(await headers());
  const accountControl = actor.ok ? (
    <div className="flex min-w-0 items-center gap-3">
      {actor.value.kind === "account" ? (
        <Link
          href="/profile"
          className={buttonStyles({ variant: "paper", size: "small" })}
        >
          <Icon name="user" />
          <span>{t("profile.title")}</span>
        </Link>
      ) : (
        <span
          className="nav-player hidden max-w-36 truncate lg:block"
          title={actor.value.displayName}
        >
          {actor.value.displayName}
        </span>
      )}
      <SignOutButton />
    </div>
  ) : actor.error.code === "UNAUTHENTICATED" ? (
    <Link
      href="/login"
      className={buttonStyles({ variant: "paper", size: "small" })}
    >
      <Icon name="user" />
      <span>{t("login")}</span>
    </Link>
  ) : undefined;
  return <Shell accountControl={accountControl}>{children}</Shell>;
}
