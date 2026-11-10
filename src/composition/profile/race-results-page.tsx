import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { readRaceArchive } from "@/modules/lobby/server";
import { RaceResults } from "@/modules/lobby/presentation/race/race-results";
import { RaceResultCharts } from "@/modules/lobby/presentation/race/race-result-charts";
import { Link } from "@/shared/presentation/i18n/navigation";
export async function RaceResultsPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const t = await getTranslations();
  const actor = await getCurrentActor(await headers());
  const result =
    actor.ok && actor.value.kind === "account"
      ? await readRaceArchive(
          (await params).raceId,
          actor.value.playerIdentityId,
        )
      : null;
  return (
    <div className="mx-auto max-w-5xl py-8">
      <Link href="/profile" className="font-bold underline">
        {t("profile.title")}
      </Link>
      <h1 className="my-6 text-3xl font-black">{t("profile.fullResults")}</h1>
      {result?.ok ? (
        <>
          <RaceResults race={result.value} showPodium={false} />
          <RaceResultCharts race={result.value} />
        </>
      ) : (
        <p role="alert">
          {t(
            result && !result.ok && result.error.code === "INTERNAL"
              ? "errors.INTERNAL"
              : "profile.resultsUnavailable",
          )}
        </p>
      )}
    </div>
  );
}
