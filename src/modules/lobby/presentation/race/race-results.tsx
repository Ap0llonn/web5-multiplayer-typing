"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { RaceArchive } from "../../public";
import { podiumTiming } from "./podium-timing";
import { usePodiumAudio } from "./podium-audio";
import { PlayerCharacter } from "../characters/player-character";

export function RaceResults({
  race,
  showPodium = true,
  raceId,
}: {
  showPodium?: boolean;
  raceId?: string;
  race: { players: Omit<RaceArchive["players"][number], "samples">[] };
}) {
  const t = useTranslations("race");
  const format = useFormatter();
  const winner = showPodium
    ? race.players.find(
        (player) => player.rank === 1 && player.status === "FINISHED",
      )
    : undefined;
  const timing = podiumTiming(race.players.length);
  const [muted, setMuted] = useState(false);
  usePodiumAudio(Boolean(winner), timing.search, timing.winner, muted);
  const stageRef = useRef<HTMLDivElement>(null);
  const winnerRef = useRef<HTMLLIElement>(null);
  const [spot, setSpot] = useState({ x: "50vw", y: "60vh" });
  useEffect(() => {
    const update = () => {
      const rect = winnerRef.current?.getBoundingClientRect();
      if (rect)
        setSpot({
          x: `${rect.left + rect.width / 2}px`,
          y: `${(winnerRef.current?.offsetParent?.getBoundingClientRect().top ?? rect.top) + (winnerRef.current?.offsetTop ?? 0) + rect.height / 2}px`,
        });
    };
    const frame = requestAnimationFrame(() => {
      if (showPodium)
        stageRef.current?.scrollIntoView({
          block: "center",
          behavior: "instant",
        });
      update();
    });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [showPodium]);
  const celebrationStyle = {
    "--victory-delay": `${winner ? timing.winner : timing.search}s`,
    "--spotlight-delay": `${timing.search}s`,
    "--results-delay": `${(winner ? timing.winner : timing.search) + 0.8}s`,
    "--winner-x": spot.x,
    "--winner-y": spot.y,
  } as CSSProperties;
  return (
    <section
      aria-labelledby="race-results-title"
      className="race-results"
      style={celebrationStyle}
    >
      <p className="race-eyebrow">{t("complete")}</p>
      <h2 id="race-results-title" className="text-3xl font-black" tabIndex={-1}>
        {t("results")}
      </h2>
      {winner && (
        <button
          type="button"
          className="my-3 rounded-lg border border-[var(--border)] px-3 py-2 font-bold"
          aria-pressed={!muted}
          onClick={() => setMuted(!muted)}
        >
          {t(muted ? "enablePodiumSound" : "mutePodiumSound")}
        </button>
      )}
      {winner && (
        <div
          className="podium-spotlight"
          aria-hidden="true"
          style={celebrationStyle}
        />
      )}
      {showPodium && (
        <div
          ref={stageRef}
          className="podium-stage"
          data-celebrating={Boolean(winner)}
          style={celebrationStyle}
        >
          {winner && (
            <>
              <div className="podium-comic-chaos" aria-hidden="true">
                <span>{t("stadiumLostIt")}</span>
                <span>{t("historicMoment")}</span>
                <span>{t("totallyNecessary")}</span>
              </div>
              <div className="podium-shockrings" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <div className="podium-fanclub" aria-hidden="true">
                🙌 🏆 🙌 👑 🙌 🏆 🙌
              </div>
              <div className="podium-burst" aria-hidden="true" />
              <div className="podium-confetti" aria-hidden="true">
                {Array.from({ length: 96 }, (_, index) => (
                  <i
                    key={index}
                    style={
                      {
                        "--confetti-x": `${(index * 29) % 100}%`,
                        "--confetti-turn": `${index * 47}deg`,
                        "--confetti-drift": `${(index % 2 ? 1 : -1) * (20 + (index % 50))}px`,
                        "--confetti-lag": `${(index % 6) * 0.06}s`,
                        background: [
                          "#f9c846",
                          "#ff786d",
                          "#7397ff",
                          "#92ddbd",
                        ][index % 4],
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
              <div className="podium-victory">
                <p className="podium-victory-kicker">{t("victoryHype")}</p>
                <p className="podium-victory-name">
                  {t("victoryName", { name: winner.displayName })}
                </p>
              </div>
            </>
          )}
          <ol className="race-podium">
            {race.players
              .slice(0, 3)
              .toReversed()
              .map((player) => (
                <li
                  ref={player.rank === 1 ? winnerRef : undefined}
                  key={player.playerIdentityId}
                  data-rank={player.rank}
                  className="podium-reveal"
                  style={{
                    animationDelay: `${winner && player.rank === 1 ? timing.winner : timing.place(player.rank)}s`,
                  }}
                >
                  {player.rank === 1 && (
                    <span className="podium-crown" aria-hidden="true">
                      ♛
                    </span>
                  )}
                  <span className="text-2xl font-black">
                    {format.number(player.rank)}
                  </span>
                  <PlayerCharacter
                    character={player.character}
                    playerIdentityId={player.playerIdentityId}
                    raceId={raceId}
                  />
                  <strong>{player.displayName}</strong>
                  <span>{t(player.status)}</span>
                </li>
              ))}
          </ol>
        </div>
      )}
      <div
        style={showPodium ? undefined : { animation: "none" }}
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
