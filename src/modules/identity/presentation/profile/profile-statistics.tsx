import { getTranslations } from "next-intl/server";
import { Card } from "@/shared/presentation/ui/card";
import { Icon } from "@/shared/presentation/ui/icon";

export async function ProfileStatistics() {
  const t = await getTranslations("profile");
  return (
    <div className="grid min-w-0 gap-6">
      <section aria-labelledby="profile-stats-title">
        <h2 id="profile-stats-title" className="text-xl font-black">
          {t("statsTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("statsUnavailable")}</p>
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
                <span aria-hidden="true">—</span>
                <span className="sr-only">{t("unavailable")}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <Card aria-labelledby="profile-progress-title">
        <h2 id="profile-progress-title" className="text-xl font-black">
          {t("progressTitle")}
        </h2>
        <div className="mt-5 flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--control-border)] bg-[var(--soft)] px-5 text-center">
          <Icon name="spark" className="h-8 w-8 text-[var(--accent)]" />
          <p className="max-w-sm text-sm text-muted">
            {t("progressUnavailable")}
          </p>
        </div>
      </Card>
      <Card aria-labelledby="profile-history-title">
        <h2 id="profile-history-title" className="text-xl font-black">
          {t("historyTitle")}
        </h2>
        <p className="mt-3 text-sm text-muted">{t("historyUnavailable")}</p>
      </Card>
    </div>
  );
}
