import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { AuthForm } from "@/modules/identity/presentation/auth-form";
import { LobbyPanel } from "@/modules/lobby/presentation/lobby-panel";
import { Link } from "@/shared/presentation/i18n/navigation";
import { Card } from "@/shared/presentation/ui/card";
import { Badge } from "@/shared/presentation/ui/badge";
import { buttonStyles } from "@/shared/presentation/ui/button";
import { Icon } from "@/shared/presentation/ui/icon";
import { HomeHero } from "./home-hero";
export async function HomePage() {
  const t = await getTranslations();
  const actor = await getCurrentActor(await headers());
  return (
    <>
      <HomeHero
        eyebrow={t("heroEyebrow")}
        title={t("heroTitle")}
        description={t("heroDescription")}
        sticker={t("keyboardSticker")}
      />
      {actor.ok ? (
        <div className="grid gap-5">
          <LobbyPanel
            actor={{
              playerIdentityId: actor.value.playerIdentityId,
              kind: actor.value.kind,
              displayName: actor.value.displayName,
            }}
          />
        </div>
      ) : actor.error.code !== "UNAUTHENTICATED" ? (
        <p role="alert">{t(actor.error.messageKey)}</p>
      ) : (
        <div className="action-grid">
          <Card
            tone="yellow"
            aria-labelledby="create-room-title"
            className="flex flex-col"
          >
            <div className="flex items-center justify-between gap-4">
              <Badge>{t("hostBadge")}</Badge>
              <Icon name="spark" className="h-7 w-7" />
            </div>
            <h2 id="create-room-title" className="card-title">
              {t("create")}
            </h2>
            <p className="card-description">{t("createDescription")}</p>
            <p className="mt-3 text-sm font-medium">{t("accountRequired")}</p>
            <div className="mt-auto grid gap-3 pt-8">
              <Link href="/login" className={buttonStyles()}>
                {t("login")}
                <Icon name="arrow" />
              </Link>
              <Link
                href="/signup"
                className="text-center text-sm font-bold underline underline-offset-4"
              >
                {t("signup")}
              </Link>
            </div>
          </Card>
          <Card aria-labelledby="join-room-title">
            <Badge tone="blue">{t("joinBadge")}</Badge>
            <h2 id="join-room-title" className="card-title">
              {t("join")}
            </h2>
            <p className="card-description mb-6">{t("guestDescription")}</p>
            <AuthForm mode="guest" />
          </Card>
        </div>
      )}
      <p className="home-note">
        <span className="pixel-confetti" aria-hidden="true" />
        {t("footerTagline")}
        <span className="pixel-confetti" aria-hidden="true" />
      </p>
    </>
  );
}
