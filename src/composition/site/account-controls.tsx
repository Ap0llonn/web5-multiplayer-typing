import "server-only";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { SignOutButton } from "@/modules/identity/presentation/sign-out-button";
import { Link } from "@/shared/presentation/i18n/navigation";
import { buttonStyles } from "@/shared/presentation/ui/button";
import { Icon } from "@/shared/presentation/ui/icon";

export async function getAccountControls() {
  const t = await getTranslations();
  const actor = await getCurrentActor(await headers());
  if (actor.ok) {
    return (
      <div className="nav-account-controls">
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
    );
  }
  if (actor.error.code !== "UNAUTHENTICATED") return undefined;
  return (
    <div className="nav-account-controls">
      <Link
        href="/login"
        className={buttonStyles({ variant: "paper", size: "small" })}
      >
        {t("login")}
      </Link>
      <Link
        href="/signup"
        className={buttonStyles({ variant: "pink", size: "small" })}
      >
        {t("signup")}
      </Link>
    </div>
  );
}
