import { useId } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/shared/presentation/ui/badge";
import { PreviewAvatar, type PreviewStyle } from "./preview-avatar";

export function PreviewPlayerRoster({
  players,
}: {
  players: readonly {
    id: string;
    name: string;
    style: PreviewStyle;
    local?: boolean;
  }[];
}) {
  const t = useTranslations("playPreview");
  const id = useId();

  return (
    <section className="pp-player-roster" aria-labelledby={`${id}-title`}>
      <div className="pp-roster-heading">
        <h2 id={`${id}-title`} className="pp-panel-title">
          {t("rosterTitle")}
        </h2>
        <span className="pp-player-count">
          {t("playerCount", { count: players.length })}
        </span>
      </div>
      <ul className="pp-roster-grid">
        {players.map((player) => (
          <li
            key={player.id}
            className={`pp-player-card pp-player-card--${player.style}${player.local ? " pp-player-card--local" : ""}`}
            data-testid={player.local ? "preview-local-player" : undefined}
          >
            <PreviewAvatar style={player.style} />
            <div className="pp-player-info">
              <span className="pp-player-name">{player.name}</span>
              {player.local ? (
                <Badge tone="mint" className="pp-player-status">
                  {t("you")}
                </Badge>
              ) : (
                <span className="pp-player-status">{t("samplePlayer")}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
