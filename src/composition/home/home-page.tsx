import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { LobbyPanel } from "@/modules/lobby/presentation/lobby-panel";
import { Icon } from "@/shared/presentation/ui/icon";
import { HomeEntryCards } from "./home-entry-cards";
import { HomeHero } from "./home-hero";
import { HowItWorks } from "./how-it-works";

export async function HomePage() {
  const t = await getTranslations();
  const actor = await getCurrentActor(await headers());
  return (
    <>
      <HomeHero />
      <div className="play-section-heading">
        <p>{t("pickYourSide")}</p>
        <a href="#how-it-works">
          {t("howLink")}
          <Icon name="arrow" />
        </a>
      </div>
      {actor.ok ? (
        <LobbyPanel
          actor={{
            playerIdentityId: actor.value.playerIdentityId,
            kind: actor.value.kind,
            displayName: actor.value.displayName,
          }}
        />
      ) : actor.error.code !== "UNAUTHENTICATED" ? (
        <p role="alert">{t(actor.error.messageKey)}</p>
      ) : (
        <HomeEntryCards />
      )}
      <HowItWorks />
    </>
  );
}
