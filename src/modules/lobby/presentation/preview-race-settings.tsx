import { useId } from "react";
import { useTranslations } from "next-intl";

const settingKeys = ["language", "length", "difficulty", "bonuses"] as const;

export function PreviewRaceSettings() {
  const t = useTranslations("playPreview");
  const id = useId();

  return (
    <section className="pp-race-settings" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="pp-panel-title">
        {t("settingsTitle")}
      </h2>
      <dl className="pp-settings-list">
        {settingKeys.map((key) => (
          <div key={key} className="pp-setting">
            <dt>{t(`settings.${key}`)}</dt>
            <dd>{t(`settings.${key}Value`)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
