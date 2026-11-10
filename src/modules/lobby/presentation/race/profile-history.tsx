"use client";
import { Link } from "@/shared/presentation/i18n/navigation";
import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

export type ProfileHistoryRow = {
  raceId: string;
  finishedAt: number;
  rank: number | null;
  status: string;
  wpm: number;
  grossWpm: number;
  accuracy: number;
  errors: number;
  elapsedMs: number;
};
export function ProfileHistory({ rows }: { rows: ProfileHistoryRow[] }) {
  const t = useTranslations("profile");
  const format = useFormatter();
  const [page, setPage] = useState(0);
  const recent = rows.slice(0, 30).reverse();
  const maximum = Math.max(1, ...recent.map((row) => row.wpm));
  return (
    <div className="grid min-w-0 gap-6">
      <section className="rounded-2xl border border-[var(--border)] p-5">
        <h2 className="text-xl font-black">{t("progressTitle")}</h2>
        <p className="text-sm text-muted">{t("chartDescription")}</p>
        {recent.length ? (
          <svg
            viewBox="0 0 600 180"
            role="img"
            aria-label={t("chartDescription")}
            className="mt-4 w-full text-[var(--accent)]"
          >
            <text x="0" y="15" fill="currentColor" fontSize="12">
              {format.number(maximum, { maximumFractionDigits: 1 })}
            </text>
            <path d="M35 10V155H590" fill="none" stroke="currentColor" />
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              points={recent
                .map(
                  (row, i) =>
                    `${40 + (i * 540) / Math.max(1, recent.length - 1)},${150 - (row.wpm / maximum) * 130}`,
                )
                .join(" ")}
            />
            {recent.map((row, i) => (
              <circle
                key={row.raceId}
                cx={40 + (i * 540) / Math.max(1, recent.length - 1)}
                cy={150 - (row.wpm / maximum) * 130}
                r="4"
                fill="currentColor"
              >
                <title>
                  {`${format.dateTime(row.finishedAt)}: ${format.number(row.wpm)}`}
                </title>
              </circle>
            ))}
            <text x="35" y="175" fill="currentColor" fontSize="12">
              {format.dateTime(recent[0].finishedAt)}
            </text>
            <text
              x="590"
              y="175"
              textAnchor="end"
              fill="currentColor"
              fontSize="12"
            >
              {format.dateTime(recent[recent.length - 1].finishedAt)}
            </text>
          </svg>
        ) : (
          <p>{t("historyEmpty")}</p>
        )}
      </section>
      <section className="min-w-0 rounded-2xl border border-[var(--border)] p-5">
        <h2 className="text-xl font-black">{t("historyTitle")}</h2>
        <p className="text-sm text-muted">{t("historyLimit")}</p>
        {rows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="mt-4 w-full text-left text-sm">
                <caption className="sr-only">{t("historyTitle")}</caption>
                <thead>
                  <tr>
                    {[
                      "date",
                      "rank",
                      "averageWpm",
                      "accuracy",
                      "status",
                      "raceDetails",
                    ].map((key) => (
                      <th className="px-4 py-4" key={key}>
                        {t(key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(page * 10, page * 10 + 10).map((row) => (
                    <tr key={row.raceId}>
                      <td className="px-4 py-4">
                        {format.dateTime(row.finishedAt, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-4">{row.rank ?? "—"}</td>
                      <td className="px-4 py-4">
                        {format.number(row.wpm, { maximumFractionDigits: 1 })}
                      </td>
                      <td className="px-4 py-4">
                        {format.number(row.accuracy, {
                          maximumFractionDigits: 1,
                        })}{" "}
                        %
                      </td>
                      <td className="px-4 py-4">
                        {t(
                          row.status === "FINISHED"
                            ? "finished"
                            : row.status === "TIMEOUT"
                              ? "timeout"
                              : "abandoned",
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <>
                          <Link
                            href={`/profile/races/${encodeURIComponent(row.raceId)}`}
                            className="font-bold underline"
                          >
                            {t("fullResults")}
                          </Link>
                          <details className="mt-3">
                            <summary className="cursor-pointer font-bold">
                              {t("raceDetails")}
                            </summary>
                            <dl className="mt-2 grid gap-2">
                              {(
                                [
                                  [
                                    "grossWpm",
                                    format.number(row.grossWpm, {
                                      maximumFractionDigits: 1,
                                    }),
                                  ],
                                  ["errorsCount", format.number(row.errors)],
                                  [
                                    "duration",
                                    t("durationSeconds", {
                                      seconds:
                                        Math.round(row.elapsedMs / 100) / 10,
                                    }),
                                  ],
                                ] as const
                              ).map(([label, value]) => (
                                <div key={label}>
                                  <dt className="text-muted">{t(label)}</dt>
                                  <dd>{value}</dd>
                                </div>
                              ))}
                            </dl>
                          </details>
                        </>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav
              className="mt-4 flex justify-between"
              aria-label={t("historyTitle")}
            >
              <button disabled={page === 0} onClick={() => setPage(page - 1)}>
                {t("previous")}
              </button>
              <span>
                {page + 1} / {Math.ceil(rows.length / 10)}
              </span>
              <button
                disabled={(page + 1) * 10 >= rows.length}
                onClick={() => setPage(page + 1)}
              >
                {t("next")}
              </button>
            </nav>
          </>
        ) : (
          <p>{t("historyEmpty")}</p>
        )}
      </section>
    </div>
  );
}
