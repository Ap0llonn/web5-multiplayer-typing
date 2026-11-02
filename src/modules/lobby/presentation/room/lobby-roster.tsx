"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { LobbySnapshot } from "../../public";
import type { OperationResult } from "@/shared/contracts/operation-result";
import { ConfirmationModal } from "@/shared/presentation/ui/confirmation-modal";
import { Badge } from "@/shared/presentation/ui/badge";
import { Button } from "@/shared/presentation/ui/button";
import { PlayerCharacter } from "../characters/player-character";
import "../characters/characters.css";

export function LobbyRoster({
  room,
  playerIdentityId,
  pending = false,
  onKick,
}: {
  room: LobbySnapshot;
  playerIdentityId?: string;
  pending?: boolean;
  onKick?: (
    playerIdentityId: string,
  ) => Promise<OperationResult<LobbySnapshot>>;
}) {
  const t = useTranslations();
  const [targetId, setTargetId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const target = room.members.find(
    (member) => member.playerIdentityId === targetId,
  );
  const canKick = onKick && playerIdentityId === room.hostPlayerIdentityId;
  return (
    <section className="lobby-player-roster" aria-label={t("roster")}>
      <div className="lobby-roster-heading">
        <h2 ref={headingRef} tabIndex={-1}>
          {t("play.rosterTitle")}
        </h2>
        <span>{t("play.playerCount", { count: room.members.length })}</span>
      </div>
      <ul className="lobby-roster-grid">
        {room.members.map((member) => (
          <li
            className={`lobby-player-card${member.playerIdentityId === playerIdentityId ? " lobby-player-card-self" : ""}`}
            data-testid="member-row"
            data-player-id={member.playerIdentityId}
            key={member.playerIdentityId}
          >
            <PlayerCharacter character={member.character} />
            <div className="lobby-player-info">
              <span className="lobby-player-name">{member.displayName}</span>
              <span className="lobby-player-status">
                <span data-testid="member-kind">
                  {t(`memberKind.${member.kind}`)}
                </span>{" "}
                · {t(member.role)} · {t(member.online ? "online" : "offline")}
              </span>
              <div className="lobby-player-badges">
                {member.playerIdentityId === room.hostPlayerIdentityId && (
                  <Badge tone="yellow">{t("host")}</Badge>
                )}
                {member.playerIdentityId === playerIdentityId && (
                  <Badge tone="mint">{t("play.you")}</Badge>
                )}
              </div>
              {canKick &&
                member.playerIdentityId !== room.hostPlayerIdentityId && (
                  <div className="mt-3 flex flex-col items-start gap-2">
                    <Button
                      variant="paper"
                      size="small"
                      disabled={pending}
                      aria-haspopup="dialog"
                      onClick={() => {
                        setTargetId(member.playerIdentityId);
                      }}
                    >
                      {t("play.kickMember", { name: member.displayName })}
                    </Button>
                  </div>
                )}
            </div>
          </li>
        ))}
      </ul>
      {canKick && target && onKick && (
        <ConfirmationModal
          key={target.playerIdentityId}
          title={t("play.kickMember", { name: target.displayName })}
          description={t("play.kickWarning", { name: target.displayName })}
          confirmLabel={t("play.confirmKick")}
          cancelLabel={t("play.cancelKick")}
          pending={pending}
          returnFocusRef={headingRef}
          onClose={() => setTargetId(null)}
          onConfirm={() => onKick(target.playerIdentityId)}
        />
      )}
    </section>
  );
}
