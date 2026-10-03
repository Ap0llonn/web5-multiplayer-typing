import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { AuthForm } from "@/modules/identity/presentation/auth-form";
import { SignOutButton } from "@/modules/identity/presentation/sign-out-button";
import { LobbyPanel } from "@/modules/lobby/presentation/lobby-panel";
import { Link } from "@/shared/presentation/i18n/navigation";
export async function HomePage() {
  const t = await getTranslations();
  const actor = await getCurrentActor(await headers());
  return (
    <>
      <h1>{t("title")}</h1>
      <p>{t("roomIntro")}</p>
      {actor.ok ? (
        <div className="grid gap-5">
          <div className="flex items-center justify-between">
            <p>{actor.value.displayName}</p>
            <SignOutButton />
          </div>
          <LobbyPanel
            actor={{
              playerIdentityId: actor.value.playerIdentityId,
              kind: actor.value.kind,
              displayName: actor.value.displayName,
            }}
          />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <section>
            <h2>{t("login")}</h2>
            <div className="flex gap-4">
              <Link href="/login">{t("login")}</Link>
              <Link href="/signup">{t("signup")}</Link>
            </div>
            {actor.error.code === "INTERNAL" && (
              <p role="alert">{t("errors.INTERNAL")}</p>
            )}
          </section>
          <AuthForm mode="guest" />
        </div>
      )}
    </>
  );
}
