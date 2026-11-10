import { getTranslations } from "next-intl/server";

export async function ProfileStatistics({
  metrics,
}: {
  metrics: {
    bestWpm: number;
    averageWpm: number;
    accuracy: number;
    races: number;
    wins: number;
    unknownRanks: number;
  } | null;
}) {
  const t = await getTranslations("profile");
  return (
    <div className="grid min-w-0 gap-6">
      <section aria-labelledby="profile-stats-title">
        <h2 id="profile-stats-title" className="text-xl font-black">
          {t("statsTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {metrics ? t("metricsDescription") : t("statsUnavailable")}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(
            ["bestWpm", "averageWpm", "accuracy", "races", "wins"] as const
          ).map((key) => (
            <div
              key={key}
              className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4"
            >
              <dt className="text-sm font-bold text-muted">{t(key)}</dt>
              <dd className="mt-2 text-3xl font-black">
                {metrics ? (
                  <>
                    {Math.round(metrics[key] * 10) / 10}
                    {key === "accuracy" ? " %" : ""}
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">{t("unavailable")}</span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {metrics && metrics.unknownRanks > 0 && (
        <p className="text-sm text-muted">{t("legacyRanks")}</p>
      )}
    </div>
  );
}
