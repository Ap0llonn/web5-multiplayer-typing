import { useTranslations } from "next-intl";
import { Icon } from "@/shared/presentation/ui/icon";

export function HowItWorks() {
  const t = useTranslations("howItWorks");
  return (
    <section
      className="how-it-works"
      id="how-it-works"
      aria-labelledby="how-title"
    >
      <div className="how-heading">
        <p className="section-eyebrow">{t("eyebrow")}</p>
        <h2 id="how-title">{t("title")}</h2>
      </div>
      <ol className="steps-list">
        {(["choose", "share", "meet"] as const).map((step, index) => (
          <li key={step}>
            <span
              className={`step-key step-key--${index + 1}`}
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div>
              <h3>{t(`${step}.title`)}</h3>
              <p>{t(`${step}.description`)}</p>
            </div>
            {index < 2 && <Icon name="arrow" className="step-arrow" />}
          </li>
        ))}
      </ol>
    </section>
  );
}
