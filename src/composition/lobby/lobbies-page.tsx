import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/presentation/i18n/navigation";
import { buttonStyles } from "@/shared/presentation/ui/button";

export async function LobbiesPage() {
  const t = await getTranslations();
  return (
    <section
      className="mx-auto max-w-xl py-12 text-center"
      aria-labelledby="lobbies-title"
    >
      <h1 id="lobbies-title" className="text-4xl font-black tracking-tight">
        {t("siteNav.seeLobbies")}
      </h1>
      <p className="mt-4 font-bold">{t("lobbies.comingSoon")}</p>
      <p className="mt-2 text-muted">{t("lobbies.unavailable")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/play" className={buttonStyles({ variant: "pink" })}>
          {t("join")}
        </Link>
        <Link
          href="/play/create"
          className={buttonStyles({ variant: "paper" })}
        >
          {t("siteNav.createRace")}
        </Link>
      </div>
    </section>
  );
}
