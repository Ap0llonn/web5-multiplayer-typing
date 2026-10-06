"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/shared/presentation/i18n/navigation";
import { PreviewPlayerEditor } from "./preview-player-editor";
import { useRoomPreview } from "./room-preview-provider";

export function PreviewPlayerPage() {
  const t = useTranslations("playPreview");
  const preview = useRoomPreview();
  const router = useRouter();
  useEffect(() => {
    if (!preview.code) router.replace("/play");
  }, [preview.code, router]);

  if (!preview.code) return <Link href="/play">{t("backButton")}</Link>;
  return (
    <div className="pp-setup">
      <section className="pp-player-pass" aria-label={t("ticketLabel")}>
        <div className="pp-ticket-top">
          <span>{t("ticketLabel")}</span>
          <span>
            {t("roomTitle")}{" "}
            <span className="pp-room-code">{preview.code}</span>
          </span>
        </div>
        <PreviewPlayerEditor
          name={preview.name}
          style={preview.style}
          ready={preview.player !== null}
          onNameChange={preview.changeName}
          onStyleChange={preview.changeStyle}
          onReady={() => {
            preview.savePlayer();
            router.push("/play/room");
          }}
          onCancel={() => {
            if (preview.player) {
              preview.prepareEdit();
              router.push("/play/room");
            } else {
              preview.leaveRoom();
              router.push("/play");
            }
          }}
        />
      </section>
    </div>
  );
}
