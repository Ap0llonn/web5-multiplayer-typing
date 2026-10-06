"use client";
import { useTranslations } from "next-intl";
import type { LobbySnapshot } from "../../public";
import { Badge } from "@/shared/presentation/ui/badge";
import { PlayerCharacter } from "../characters/player-character";
import "../characters/characters.css";

export function LobbyRoster({
  room,
  playerIdentityId,
}: {
  room: LobbySnapshot;
  playerIdentityId?: string;
}) {
  const t = useTranslations();
  return (
    <section className="lobby-player-roster" aria-label={t("roster")}>
      <div className="lobby-roster-heading">
        <h2>{t("play.rosterTitle")}</h2>
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
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
