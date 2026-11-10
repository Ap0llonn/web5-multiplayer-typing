"use client";
import type { CSSProperties } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { RaceSnapshot } from "../../public";
import { Shield } from "lucide-react";
import { selectLaneBonusFeedback } from "./bonus-feedback";
import { raceItemIcons } from "./race-item-icons";
import { PlayerCharacter } from "../characters/player-character";
type TrackStyle = CSSProperties & {
  "--race-columns": number;
  "--race-rows": number;
  "--race-mobile-columns": number;
  "--race-mobile-rows": number;
};
export function RaceTrack({
  race,
  playerIdentityId,
  now = race.serverNow,
}: {
  race: RaceSnapshot;
  playerIdentityId: string;
  now?: number;
}) {
  const t = useTranslations("race");
  const format = useFormatter();
  const count = race.players.length;
  const columns = Math.max(1, Math.ceil(count / 6));
  const mobileColumns = count > 18 ? 3 : count > 8 ? 2 : 1;
  const gridStyle: TrackStyle = {
    "--race-columns": columns,
    "--race-rows": Math.max(1, Math.ceil(count / columns)),
    "--race-mobile-columns": mobileColumns,
    "--race-mobile-rows": Math.max(1, Math.ceil(count / mobileColumns)),
  };
  return (
    <section className="race-track" aria-labelledby="race-track-title">
      <div className="flex items-center justify-between gap-4">
        <h2 id="race-track-title" className="text-2xl font-black">
          {t("track")}
        </h2>
        <span className="text-sm font-black">{t("finish")}</span>
      </div>
      {race.settings.bonuses && (
        <p className="sr-only">{t("items.checkpoints")}</p>
      )}
      <div
        className="race-lanes"
        data-compact={count > 6}
        style={gridStyle}
        tabIndex={0}
        role="group"
        aria-label={t("track")}
      >
        {race.players.map((player) => {
          const progress = Math.min(
            100,
            (player.progress / player.targetLength) * 100,
          );
          const local = player.playerIdentityId === playerIdentityId;
          const impact = selectLaneBonusFeedback(
            race.events,
            player.playerIdentityId,
            now,
          );
          const ImpactIcon = impact
            ? impact.effect === "blocked"
              ? Shield
              : raceItemIcons[impact.effect]
            : null;
          return (
            <div
              key={player.playerIdentityId}
              className="race-lane"
              data-local={local}
            >
              <div className="race-lane-label">
                <span title={`${player.rank}. ${player.displayName}`}>
                  {player.rank}. {player.displayName}{" "}
                  {player.kind === "bot" && <strong>· {t("botMarker")}</strong>}
                  {local && <strong>· {t("you")}</strong>}
                </span>
                <span className={count > 6 ? "sr-only" : undefined}>
                  {format.number(player.wpm, { maximumFractionDigits: 1 })}{" "}
                  {t("wpm")} · {t(player.status)}
                  {player.shield && <span> · {t("items.shield")}</span>}
                  {(player.fogUntil ?? 0) > now && (
                    <span> · {t("items.fog")}</span>
                  )}
                </span>
              </div>
              <div
                className="race-lane-road"
                role="progressbar"
                aria-label={t("progressOf", { name: player.displayName })}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                {race.settings.bonuses &&
                  ([25, 50, 75] as const).map((checkpoint) => (
                    <span
                      key={checkpoint}
                      className="race-mystery-box"
                      data-checkpoint={checkpoint}
                      data-passed={(race.bonusRulesVersion === 2
                        ? (player.boxCheckpoints ?? [])
                        : race.checkpoints
                      ).includes(checkpoint)}
                      style={{ left: `${checkpoint}%` }}
                      aria-hidden="true"
                    >
                      ?
                    </span>
                  ))}
                <div
                  className="race-runner"
                  data-shield={player.shield}
                  data-fog-active={(player.fogUntil ?? 0) > now}
                  style={{
                    left: `calc(${progress}% - ${progress / 100} * var(--race-runner-size))`,
                  }}
                >
                  <PlayerCharacter
                    character={player.character}
                    playerIdentityId={player.playerIdentityId}
                  />
                  {impact && ImpactIcon && (
                    <span
                      key={impact.id}
                      className="race-lane-impact"
                      data-impact={impact.effect}
                      aria-hidden="true"
                    >
                      <ImpactIcon />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
