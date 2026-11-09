"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { LobbyActor } from "../../public";
import { Link, useRouter } from "@/shared/presentation/i18n/navigation";
import { Button, buttonStyles } from "@/shared/presentation/ui/button";
import { Icon } from "@/shared/presentation/ui/icon";
import { LobbyRoster } from "./lobby-roster";
import { RaceSettingsPanel } from "../race/race-settings";
import { RacePanel } from "../race/race-panel";
import { ConfirmationModal } from "@/shared/presentation/ui/confirmation-modal";
import { LanguageSwitcher } from "@/shared/presentation/ui/language-switcher";
import { ThemeSwitcher } from "@/shared/presentation/ui/theme-switcher";
import { useLobbyRoom } from "./use-lobby-room";
import "./lobby-room.css";

export function LobbyRoom({
  actor,
  configuration = false,
}: {
  actor: LobbyActor;
  configuration?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const {
    room,
    loaded,
    pending,
    connection,
    messageKey,
    send,
    acceptSnapshot,
  } = useLobbyRoom();
  const [leaving, setLeaving] = useState(false);
  const leaveButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const code = room?.code;
  const active = room?.state === "COUNTDOWN" || room?.state === "RACING";
  const isHost =
    actor.kind === "account" &&
    room?.hostPlayerIdentityId === actor.playerIdentityId;
  const humans =
    room?.members.filter((m) => m.role === "PARTICIPANT").length ?? 0;
  const canStart =
    humans > 0 && humans + (room?.raceSettings?.bots?.length ?? 0) >= 2;
  async function leave() {
    const result = await send(`/api/lobbies/${code}/leave`, {});
    if (result.ok) router.push("/play");
    return result;
  }
  useEffect(() => {
    if (code) heading.current?.focus();
  }, [code]);
  if (!room)
    return (
      <div className="lobby-room-empty">
        <h1>{t("play.roomTitle")}</h1>
        {messageKey && <p role="alert">{t(messageKey)}</p>}
        {loaded ? (
          <Link href="/play">{t("join")}</Link>
        ) : (
          <p role="status">{t("pending")}</p>
        )}
      </div>
    );
  if (configuration)
    return (
      <div className="lobby-room">
        <div className="lobby-room-heading">
          <div>
            <h1 ref={heading} tabIndex={-1}>
              {t("race.settings")}
            </h1>
            <p className="mt-2 text-muted">{room.name}</p>
          </div>
          <div className="lobby-room-actions">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <Link
              href="/play/room"
              className={buttonStyles({ variant: "paper", size: "small" })}
            >
              {t("race.backToRoom")}
            </Link>
          </div>
        </div>
        {messageKey && <p role="alert">{t(messageKey)}</p>}
        {active ? (
          <p role="status">{t("race.settingsLocked")}</p>
        ) : (
          <RaceSettingsPanel
            key={JSON.stringify([
              room.raceSettings,
              room.capacity,
              room.visibility,
            ])}
            room={room}
            isHost={isHost}
            pending={pending}
            send={send}
          />
        )}
      </div>
    );
  return (
    <div className="lobby-room" data-race-active={active}>
      {messageKey && <p role="alert">{t(messageKey)}</p>}
      <div className="lobby-room-heading">
        <div>
          <p className="lobby-room-eyebrow">{t("play.lobbyEyebrow")}</p>
          <h1 ref={heading} tabIndex={-1}>
            {room.name}
          </h1>
          <p className="mt-2 text-sm font-bold">
            {t(
              room.visibility === "PUBLIC"
                ? "lobbies.publicVisibility"
                : "lobbies.codeVisibility",
            )}
          </p>
        </div>
        <div className="lobby-room-actions">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {!active && (
            <Link
              href="/play/room/settings"
              aria-label={t("race.openSettings")}
              title={t("race.openSettings")}
              className={buttonStyles({ variant: "paper", size: "small" })}
            >
              <Icon name="settings" />
            </Link>
          )}
          {room.state === "WAITING" && isHost && (
            <Button
              size="small"
              disabled={pending || !canStart}
              title={!canStart ? t("race.minimum") : undefined}
              onClick={() =>
                void send(`/api/lobbies/${room.code}/race/start`, {})
              }
            >
              {t("race.start")}
            </Button>
          )}
          {!active && (
            <Button
              variant="paper"
              size="small"
              disabled={pending}
              onClick={() => router.push(`/play/player?code=${room.code}`)}
            >
              {t("play.editCharacter")}
              <Icon name="user" />
            </Button>
          )}
          <Button
            ref={leaveButton}
            variant="paper"
            size="small"
            disabled={pending}
            onClick={() => {
              if (active) setLeaving(true);
              else void leave();
            }}
          >
            {t("leave")}
            <Icon name="enter" />
          </Button>
        </div>
      </div>
      {room.race && (
        <RacePanel
          key={room.race.id}
          room={room}
          race={room.race}
          playerIdentityId={actor.playerIdentityId}
          isHost={
            actor.kind === "account" &&
            room.hostPlayerIdentityId === actor.playerIdentityId
          }
          connected={connection === "connected"}
          pending={pending}
          send={send}
          acceptSnapshot={acceptSnapshot}
        />
      )}
      <div className={active ? "sr-only" : "lobby-code-banner"}>
        <div>
          <p>{t("code")}</p>
          <strong data-testid="room-code">{room.code}</strong>
        </div>
        <p>{t("shareCode")}</p>
      </div>
      {!room.race && (
        <div className="lobby-clubhouse">
          <Image
            src="/illustrations/typing-clubhouse.png"
            width={1774}
            height={887}
            sizes="(max-width: 1480px) 100vw, 1480px"
            alt=""
            aria-hidden="true"
            className="lobby-clubhouse-art"
            loading="eager"
          />
          <div className="lobby-stage-topline">
            <span className="lobby-waiting-dot" aria-hidden="true" />
            {t(room.state)}
            <span className="lobby-connection">
              {t("connection")}: {t(connection)}
            </span>
          </div>
          <LobbyRoster
            room={room}
            playerIdentityId={actor.playerIdentityId}
            pending={pending}
            onKick={(playerIdentityId) =>
              send(`/api/lobbies/${room.code}/kick`, { playerIdentityId })
            }
          />
          <p className="lobby-stage-caption">
            <Icon name="spark" />
            {t("play.stageCaption")}
          </p>
        </div>
      )}
      {leaving && (
        <ConfirmationModal
          title={t("race.abandonTitle")}
          description={t("race.leaveDescription")}
          confirmLabel={t("leave")}
          cancelLabel={t("race.cancel")}
          returnFocusRef={leaveButton}
          pending={pending}
          onClose={() => setLeaving(false)}
          onConfirm={leave}
        />
      )}
    </div>
  );
}
