import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/presentation/i18n/navigation";
import { buttonStyles } from "@/shared/presentation/ui/button";
import { Icon } from "@/shared/presentation/ui/icon";
import { Badge } from "@/shared/presentation/ui/badge";

const steps = [
  { key: "code", icon: "enter" },
  { key: "character", icon: "user" },
  { key: "crew", icon: "people" },
] as const;

export async function HomePage() {
  const t = await getTranslations();
  return (
    <div className="mx-auto max-w-4xl space-y-10 py-3 sm:space-y-12 sm:py-6">
      <section
        aria-labelledby="home-title"
        className="flex flex-col items-center rounded-3xl border border-[var(--hero-border)] bg-[var(--hero)] px-6 py-10 text-center sm:px-10 sm:py-14"
      >
        <Badge className="mb-5 gap-2">
          <Icon name="people" className="h-4 w-4" />
          {t("homeContent.eyebrow")}
        </Badge>
        <h1
          id="home-title"
          className="max-w-xl text-4xl leading-tight font-black tracking-tight sm:text-5xl"
        >
          {t("heroTitle")}
        </h1>
        <p className="mt-4 max-w-lg text-base text-muted sm:text-lg">
          {t("heroDescription")}
        </p>
        <Link
          href="/play"
          className={buttonStyles({ variant: "pink", className: "mt-7" })}
        >
          {t("join")}
          <Icon name="arrow" />
        </Link>
        <p className="mt-3 text-sm text-muted">{t("noAccountNeeded")}</p>
      </section>

      <section aria-labelledby="home-steps-title">
        <div className="text-center">
          <h2 id="home-steps-title" className="text-2xl font-extrabold">
            {t("homeContent.stepsTitle")}
          </h2>
          <p className="mt-2 text-muted">{t("homeContent.stepsDescription")}</p>
        </div>
        <ol className="mt-6 grid gap-5 sm:grid-cols-3 sm:gap-6">
          {steps.map((step, index) => (
            <li key={step.key} className="flex gap-4 sm:flex-col sm:gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--soft)] font-black text-[var(--accent)]"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="flex items-center gap-2 font-extrabold">
                  <Icon name={step.icon} className="h-4 w-4" />
                  {t(`homeContent.steps.${step.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {t(`homeContent.steps.${step.key}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="home-host-title"
        className="flex flex-col items-start gap-5 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
      >
        <div className="max-w-lg">
          <h2 id="home-host-title" className="text-xl font-extrabold">
            {t("homeContent.hostTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("homeContent.hostDescription")}
          </p>
          <p className="mt-2 text-sm font-bold text-muted">
            {t("homeContent.hostAccountRequired")}
          </p>
        </div>
        <Link
          href="/play/create"
          className={buttonStyles({ variant: "paper", className: "shrink-0" })}
        >
          <Icon name="plus" />
          {t("create")}
        </Link>
      </section>
    </div>
  );
}
