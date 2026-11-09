"use client";
import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { LobbySnapshot, RaceSnapshot } from "../../public";
import type { OperationResult } from "@/shared/contracts/operation-result";
import { Button } from "@/shared/presentation/ui/button";
import { Card } from "@/shared/presentation/ui/card";
import { ConfirmationModal } from "@/shared/presentation/ui/confirmation-modal";
import { useRouter } from "@/shared/presentation/i18n/navigation";
import { useRaceTyping } from "./use-race-typing";
import { RaceTrack } from "./race-track";
import { RaceResults } from "./race-results";
import { RaceBonusLog } from "./race-bonus-log";
import { RaceBonusFeedback } from "./race-bonus-feedback";
import { RacePassage } from "./race-passage";
import "./race.css";
import "./race-bonus-feedback.css";

export function RacePanel({
  room,
  race,
  playerIdentityId,
  isHost,
  connected,
  pending,
  send,
  acceptSnapshot,
}: {
  room: LobbySnapshot;
  race: RaceSnapshot;
  playerIdentityId: string;
  isHost: boolean;
  connected: boolean;
  pending: boolean;
  send: (
    path: string,
    body: unknown,
  ) => Promise<OperationResult<LobbySnapshot>>;
  acceptSnapshot: (room: LobbySnapshot) => void;
}) {
  const t = useTranslations("race");
  const all = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const [now, setNow] = useState(race.serverNow);
  const [confirm, setConfirm] = useState<"abandon" | "close" | null>(null);
  const clock = useRef({ server: race.serverNow, local: 0 });
  const input = useRef<HTMLTextAreaElement>(null);
  const abandonButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    clock.current = { server: race.serverNow, local: Date.now() };
  }, [race.serverNow]);
  useEffect(() => {
    const timer = setInterval(
      () => setNow(clock.current.server + Date.now() - clock.current.local),
      100,
    );
    return () => clearInterval(timer);
  }, []);
  const self = race.players.find(
    (player) => player.playerIdentityId === playerIdentityId,
  );
  const canType =
    room.state === "RACING" && self?.status === "TYPING" && connected;
  const typing = useRaceTyping(room.code, race, canType, acceptSnapshot);
  useEffect(() => {
    if (canType && window.matchMedia("(min-width: 640px)").matches)
      input.current?.focus({ preventScroll: true });
  }, [canType]);
  useEffect(() => {
    if (room.state === "RESULTS")
      document.getElementById("race-results-title")?.focus();
  }, [room.state]);
  const remaining =
    race.settings.durationSeconds === null
      ? null
      : Math.max(
          0,
          Math.ceil(
            (race.startsAt + race.settings.durationSeconds * 1000 - now) / 1000,
          ),
        );
  return (
    <Card className="race-panel" data-active={room.state !== "RESULTS"}>
      {room.state === "RACING" && race.settings.bonuses && (
        <RaceBonusFeedback
          events={race.events}
          playerIdentityId={playerIdentityId}
          now={now}
          fogUntil={self?.status === "TYPING" ? self.fogUntil : null}
          shield={self?.status === "TYPING" && self.shield}
        />
      )}
      {room.state === "RESULTS" ? (
        <>
          <RaceResults race={race} />
          {isHost ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                disabled={pending}
                onClick={() =>
                  void send(`/api/lobbies/${room.code}/race/replay`, {})
                }
              >
                {t("replay")}
              </Button>
              <Button
                ref={closeButton}
                variant="paper"
                disabled={pending}
                onClick={() => setConfirm("close")}
              >
                {t("close")}
              </Button>
            </div>
          ) : (
            <p className="mt-5 font-bold" role="status">
              {t("waitingReplay")}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="race-topline">
            <p className="race-eyebrow">
              {t(room.state === "COUNTDOWN" ? "getReady" : "inProgress")}
            </p>
            <p className="font-black" aria-label={t("remaining")}>
              {remaining === null
                ? t("unlimited")
                : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
            </p>
          </div>
          {room.state === "COUNTDOWN" && (
            <div
              className="race-countdown"
              role="status"
              aria-live="polite"
              data-testid="race-countdown"
            >
              {Math.max(1, Math.ceil((race.startsAt - now) / 1000))}
            </div>
          )}
          <RaceTrack
            race={race}
            playerIdentityId={playerIdentityId}
            now={now}
          />
          <RaceBonusLog race={race} playerIdentityId={playerIdentityId} />
          <p className="race-mobile-notice" role="note">
            {t("physicalKeyboard")}
          </p>
          {self ? (
            <div className="race-typing">
              <div className="race-metrics">
                <span>
                  {format.number(self.wpm, { maximumFractionDigits: 1 })}{" "}
                  {t("wpm")}
                </span>
                <span>
                  {t("accuracy")}:{" "}
                  {format.number(self.accuracy / 100, {
                    style: "percent",
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>
              <div className="race-input-surface">
                <RacePassage
                  text={race.self?.text ?? race.text}
                  draft={typing.draft}
                  language={race.settings.language}
                  fog={(self.fogUntil ?? 0) > now}
                />
                <label htmlFor="race-input" className="sr-only">
                  {t("typingArea")}
                </label>
                <textarea
                  id="race-input"
                  ref={input}
                  className="race-capture"
                  value={typing.draft}
                  disabled={!canType}
                  onChange={(e) => typing.change(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  onSelect={(e) => {
                    const target = e.currentTarget;
                    target.setSelectionRange(
                      target.value.length,
                      target.value.length,
                    );
                  }}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  aria-describedby="race-help"
                />
              </div>
              <p id="race-help" className="mt-2 text-sm text-muted">
                {t(
                  race.settings.correction === "required"
                    ? "requiredHint"
                    : "freeHint",
                )}
              </p>
            </div>
          ) : (
            <p className="mt-5 font-bold" role="status">
              {t("spectating")}
            </p>
          )}
          {typing.message && (
            <p role="alert" className="mt-3 text-[var(--error)]">
              {all(typing.message)}
            </p>
          )}
          {!connected && (
            <p role="status" className="mt-3 font-bold">
              {t("reconnecting")}
            </p>
          )}
          <div className="race-actions">
            {self?.status === "TYPING" && (
              <Button
                ref={abandonButton}
                variant="paper"
                disabled={pending}
                onClick={() => setConfirm("abandon")}
              >
                {t("abandon")}
              </Button>
            )}
            {self && self.status !== "TYPING" && (
              <p className="font-black" role="status">
                {t(self.status)} · {t("waitingFinish")}
              </p>
            )}
          </div>
        </>
      )}
      {confirm && (
        <ConfirmationModal
          title={t(confirm === "abandon" ? "abandonTitle" : "closeTitle")}
          description={t(
            confirm === "abandon" ? "abandonDescription" : "closeDescription",
          )}
          confirmLabel={t(confirm === "abandon" ? "abandon" : "close")}
          cancelLabel={t("cancel")}
          returnFocusRef={confirm === "abandon" ? abandonButton : closeButton}
          pending={pending}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            const result = await send(
              `/api/lobbies/${room.code}/race/${confirm}`,
              {},
            );
            if (result.ok && confirm === "close") router.push("/play");
            return result;
          }}
        />
      )}
    </Card>
  );
}
