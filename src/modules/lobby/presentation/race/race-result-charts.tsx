"use client";
import { useFormatter, useTranslations } from "next-intl";
import type { RaceArchive } from "../../public";
export function RaceResultCharts({ race }: { race: RaceArchive }) {
  const t = useTranslations("profile");
  const format = useFormatter();
  return (
    <section className="mt-8 grid gap-4">
      <h2 className="text-2xl font-black">{t("raceCurves")}</h2>
      {race.players.map((player) => {
        const maximum = Math.max(1, ...player.samples.map((s) => s.wpm));
        const duration = Math.max(
          1,
          player.elapsedMs,
          ...player.samples.map((s) => s.elapsedMs),
        );
        return (
          <figure
            key={player.playerIdentityId}
            className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4"
          >
            <figcaption className="font-bold">{player.displayName}</figcaption>
            {player.samples.length ? (
              <svg
                viewBox="0 0 600 180"
                role="img"
                aria-label={t("raceCurveLabel", { name: player.displayName })}
                className="w-full text-[var(--accent)]"
              >
                <path d="M40 10V150H580" fill="none" stroke="currentColor" />
                <text x="0" y="20" fontSize="12" fill="currentColor">
                  {format.number(maximum, { maximumFractionDigits: 1 })}
                </text>
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  points={player.samples
                    .map(
                      (s) =>
                        `${40 + (s.elapsedMs / duration) * 530},${145 - (s.wpm / maximum) * 125}`,
                    )
                    .join(" ")}
                />
                {player.samples.map((s, i) => (
                  <circle
                    key={i}
                    cx={40 + (s.elapsedMs / duration) * 530}
                    cy={145 - (s.wpm / maximum) * 125}
                    r="3"
                    fill="currentColor"
                  >
                    <title>
                      {t("sampleLabel", {
                        seconds: format.number(s.elapsedMs / 1000),
                        wpm: format.number(s.wpm),
                      })}
                    </title>
                  </circle>
                ))}
                <text x="40" y="175" fontSize="12" fill="currentColor">
                  0 s
                </text>
                <text
                  x="580"
                  y="175"
                  textAnchor="end"
                  fontSize="12"
                  fill="currentColor"
                >
                  {format.number(duration / 1000)} s
                </text>
              </svg>
            ) : (
              <p>{t("noSamples")}</p>
            )}
          </figure>
        );
      })}
    </section>
  );
}
