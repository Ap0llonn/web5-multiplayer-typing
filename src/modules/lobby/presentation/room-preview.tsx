"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/presentation/ui/button";
import { Icon } from "@/shared/presentation/ui/icon";
import { Link, useRouter } from "@/shared/presentation/i18n/navigation";
import { PreviewPlayerRoster } from "./preview-player-roster";
import { PreviewRaceSettings } from "./preview-race-settings";
import { useRoomPreview } from "./room-preview-provider";

export function RoomPreview() {
  const t = useTranslations("playPreview");
  const preview = useRoomPreview();
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!preview.code) router.replace("/play");
    else if (!preview.player) router.replace("/play/player");
    else heading.current?.focus();
  }, [preview.code, preview.player, router]);

  if (!preview.code || !preview.player)
    return <Link href="/play">{t("backButton")}</Link>;
  return (
    <div className="pp-lobby">
      <div className="pp-room-heading">
        <div>
          <p className="pp-eyebrow">{t("lobbyEyebrow")}</p>
          <h1 ref={heading} tabIndex={-1}>
            {t("roomTitle")}{" "}
            <span className="pp-room-code">{preview.code}</span>
          </h1>
        </div>
        <div className="pp-room-actions">
          <Button
            variant="paper"
            size="small"
            onClick={() => {
              preview.prepareEdit();
              router.push("/play/player");
            }}
          >
            {t("editPlayer")}
            <Icon name="user" />
          </Button>
          <Button
            variant="paper"
            size="small"
            onClick={() => {
              preview.leaveRoom();
              router.push("/play");
            }}
            className="pp-leave-button"
          >
            {t("leaveButton")}
            <Icon name="enter" />
          </Button>
        </div>
      </div>
      <div className="pp-lobby-grid">
        <div className="pp-clubhouse">
          <Image
            src="/illustrations/typing-clubhouse.png"
            width={1774}
            height={887}
            sizes="(max-width: 1480px) 100vw, 1480px"
            alt=""
            aria-hidden="true"
            className="pp-clubhouse-art"
            loading="eager"
          />
          <div className="pp-stage-topline">
            <span className="pp-waiting-dot" aria-hidden="true" />
            {t("waitingForHost")}
          </div>
          <PreviewPlayerRoster
            players={[
              { id: "sample-one", name: t("sampleNames.one"), style: "coral" },
              { id: "sample-two", name: t("sampleNames.two"), style: "mint" },
              {
                id: "sample-three",
                name: t("sampleNames.three"),
                style: "butter",
              },
              {
                id: "sample-four",
                name: t("sampleNames.four"),
                style: "cobalt",
              },
              preview.player,
            ]}
          />
          <p className="pp-stage-caption">
            <Icon name="spark" />
            {t("stageCaption")}
          </p>
        </div>
      </div>
      <PreviewRaceSettings />
    </div>
  );
}
