import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { PublicLobbies } from "@/modules/lobby/presentation/browser/public-lobbies";
import { Link } from "@/shared/presentation/i18n/navigation";
import { buttonStyles } from "@/shared/presentation/ui/button";
import { getPublicLobbies } from "./http";
import { QuickPlay } from "./quick-play";

export async function LobbiesPage() {
  // Public directory is request-time data, never a build-time database snapshot.
  await headers();
  const t = await getTranslations();
  const result = await getPublicLobbies();
  return (
    <section
      className="mx-auto grid max-w-4xl gap-6 py-8"
      aria-labelledby="lobbies-title"
    >
      <div>
        <h1 id="lobbies-title" className="text-4xl font-black tracking-tight">
          {t("siteNav.seeLobbies")}
        </h1>
        <p className="mt-3 text-muted">{t("lobbies.description")}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/play/create" className={buttonStyles({ variant: "ink" })}>
          {t("siteNav.createRace")}
        </Link>
        <Link href="/play" className={buttonStyles({ variant: "paper" })}>
          {t("lobbies.joinByCode")}
        </Link>
      </div>
      <QuickPlay />
      <PublicLobbies initialResult={result} />
    </section>
  );
}
