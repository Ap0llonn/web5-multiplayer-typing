"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { LobbyActor } from "../../public";
import { Link, useRouter } from "@/shared/presentation/i18n/navigation";
import { Button } from "@/shared/presentation/ui/button";
import { Icon } from "@/shared/presentation/ui/icon";
import { LobbyRoster } from "./lobby-roster";
import { useLobbyRoom } from "./use-lobby-room";
import "./lobby-room.css";

export function LobbyRoom({ actor }: { actor: LobbyActor }) {
  const t = useTranslations();
  const router = useRouter();
  const { room, loaded, pending, connection, messageKey, send } =
    useLobbyRoom();
  const heading = useRef<HTMLHeadingElement>(null);
  const code = room?.code;
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
  return (
    <div className="lobby-room">
      {messageKey && <p role="alert">{t(messageKey)}</p>}
      <div className="lobby-room-heading">
        <div>
          <p className="lobby-room-eyebrow">{t("play.lobbyEyebrow")}</p>
          <h1 ref={heading} tabIndex={-1}>
            {room.name}
          </h1>
        </div>
        <div className="lobby-room-actions">
          <Button
            variant="paper"
            size="small"
            disabled={pending}
            onClick={() => router.push(`/play/player?code=${room.code}`)}
          >
            {t("play.editCharacter")}
            <Icon name="user" />
          </Button>
          <Button
            variant="paper"
            size="small"
            disabled={pending}
            onClick={() => {
              void send(`/api/lobbies/${room.code}/leave`, {}).then(
                (result) => {
                  if (result.ok) router.push("/play");
                },
              );
            }}
          >
            {t("leave")}
            <Icon name="enter" />
          </Button>
        </div>
      </div>
      <div className="lobby-code-banner">
        <div>
          <p>{t("code")}</p>
          <strong data-testid="room-code">{room.code}</strong>
        </div>
        <p>{t("shareCode")}</p>
      </div>
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
        <LobbyRoster room={room} playerIdentityId={actor.playerIdentityId} />
        <p className="lobby-stage-caption">
          <Icon name="spark" />
          {t("play.stageCaption")}
        </p>
      </div>
    </div>
  );
}
