"use client";
import { useFormatter, useTranslations } from "next-intl";
import type { RaceSnapshot } from "../../public";
import { PlayerCharacter } from "../characters/player-character";

export function RaceResults({ race }: { race: RaceSnapshot }) {
  const t = useTranslations("race");
  const format = useFormatter();
  return (
    <section aria-labelledby="race-results-title" className="race-results">
      <p className="race-eyebrow">{t("complete")}</p>
      <h2 id="race-results-title" className="text-3xl font-black" tabIndex={-1}>
        {t("results")}
      </h2>
      <ol className="race-podium">
        {race.players.slice(0, 3).map((player) => (
          <li key={player.playerIdentityId}>
            <span className="text-2xl font-black">
              {format.number(player.rank)}
            </span>
            <PlayerCharacter character={player.character} />
            <strong>{player.displayName}</strong>
            <span>{t(player.status)}</span>
          </li>
        ))}
      </ol>
      <div
        className="race-results-scroll"
        role="region"
        aria-label={t("results")}
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">{t("results")}</caption>
          <thead>
            <tr>
              {[
                "rank",
                "player",
                "wpm",
                "grossWpm",
                "accuracy",
                "errors",
                "time",
                "status",
                "bonusesReceived",
              ].map((key) => (
                <th key={key} scope="col">
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {race.players.map((player) => (
              <tr key={player.playerIdentityId}>
                <td>{format.number(player.rank)}</td>
                <th scope="row">{player.displayName}</th>
                <td>
                  {format.number(player.wpm, { maximumFractionDigits: 1 })}
                </td>
                <td>
                  {format.number(player.grossWpm, { maximumFractionDigits: 1 })}
                </td>
                <td>
                  {format.number(player.accuracy / 100, {
                    style: "percent",
                    maximumFractionDigits: 1,
                  })}
                </td>
                <td>{format.number(player.errors)}</td>
                <td>
                  {format.number(player.elapsedMs / 1000, {
                    maximumFractionDigits: 1,
                  })}{" "}
                  {t("secondsShort")}
                </td>
                <td>{t(player.status)}</td>
                <td>{format.number(player.bonusesReceived)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted">{t("saved")}</p>
    </section>
  );
}
