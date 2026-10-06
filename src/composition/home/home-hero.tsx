import { useTranslations } from "next-intl";
import { Icon } from "@/shared/presentation/ui/icon";
import { DecorativeImage } from "@/shared/presentation/ui/decorative-image";

export function HomeHero() {
  const t = useTranslations();
  return (
    <div className="home-hero">
      <div className="hero-copy">
        <p className="hero-eyebrow">
          <span aria-hidden="true" />
          {t("heroEyebrow")}
        </p>
        <h1 className="hero-title">{t("heroTitle")}</h1>
        <p className="hero-description">{t("heroDescription")}</p>
        <div className="hero-details">
          <span>
            <Icon name="people" />
            {t("participantRange")}
          </span>
          <span>
            <Icon name="check" />
            {t("guestsWelcome")}
          </span>
        </div>
      </div>
      <div className="keyboard-scene">
        <span className="keyboard-sticker" aria-hidden="true">
          {t("keyboardSticker")}
        </span>
        <DecorativeImage kind="keyboard" eager className="keyboard-art" />
        <span className="keyboard-caption" aria-hidden="true">
          <Icon name="spark" />
          {t("keyboardCaption")}
        </span>
      </div>
    </div>
  );
}
