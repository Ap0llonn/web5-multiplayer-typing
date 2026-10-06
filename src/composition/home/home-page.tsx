import { getTranslations } from "next-intl/server";
import { Icon } from "@/shared/presentation/ui/icon";
import { HomeEntryCards } from "./home-entry-cards";
import { HomeHero } from "./home-hero";
import { HowItWorks } from "./how-it-works";

export async function HomePage() {
  const t = await getTranslations();
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
      <HomeEntryCards />
      <HowItWorks />
    </>
  );
}
