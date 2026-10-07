import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/presentation/i18n/navigation";
import { buttonStyles } from "@/shared/presentation/ui/button";
import { Icon } from "@/shared/presentation/ui/icon";

export async function HomePage() {
  const t = await getTranslations();
  return (
    <section
      aria-labelledby="home-title"
      className="mx-auto flex max-w-xl flex-col items-center py-12 text-center sm:py-20"
    >
      <h1
        id="home-title"
        className="text-4xl leading-tight font-black tracking-tight sm:text-5xl"
      >
        {t("heroTitle")}
      </h1>
      <p className="mt-4 max-w-sm text-muted">{t("heroDescription")}</p>
      <Link
        href="/play"
        className={buttonStyles({ variant: "pink", className: "mt-8" })}
      >
        {t("join")}
        <Icon name="arrow" />
      </Link>
      <p className="mt-4 text-sm text-muted">{t("noAccountNeeded")}</p>
    </section>
  );
}
