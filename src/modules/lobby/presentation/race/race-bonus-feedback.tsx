"use client";
import type { CSSProperties } from "react";
import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RaceBonusEvent } from "../../public";
import { selectBonusFeedback } from "./bonus-feedback";
import { raceItemIcons } from "./race-item-icons";

type FeedbackStyle = CSSProperties & { "--feedback-index": number };
type ParticleStyle = CSSProperties & { "--particle": number };
export function RaceBonusFeedback({
  events,
  playerIdentityId,
  now,
  fogUntil,
  shield,
}: {
  events: RaceBonusEvent[];
  playerIdentityId: string;
  now: number;
  fogUntil: number | null;
  shield: boolean;
}) {
  const t = useTranslations("race.feedback");
  const items = useTranslations("race.items");
  const fog = (fogUntil ?? 0) > now;
  const feedback = selectBonusFeedback(events, playerIdentityId, now).filter(
    (cue) =>
      cue.role === "sender" ||
      ((cue.effect !== "fog" || fog) && (cue.effect !== "shield" || shield)),
  );
  if (!fog && !shield && !feedback.length) return null;
  return (
    <div className="race-bonus-feedback" aria-hidden="true">
      {fog && (
        <div className="race-fog-border" data-atmosphere="fog">
          {[0, 1, 2, 3].map((side) => (
            <span key={side} />
          ))}
        </div>
      )}
      {shield && (
        <div className="race-shield-border" data-atmosphere="shield" />
      )}
      {feedback.map((cue, index) => {
        const ItemIcon =
          cue.effect === "blocked" ? Shield : raceItemIcons[cue.type];
        const cueStyle: FeedbackStyle = {
          zIndex: index,
          "--feedback-index": index,
        };
        return (
          <div
            key={cue.id}
            className="race-bonus-visual"
            data-bonus-visual={cue.effect}
            data-role={cue.role}
            style={cueStyle}
          >
            <div className="race-bonus-particles">
              {Array.from({ length: 8 }, (_, particle) => {
                const style: ParticleStyle = { "--particle": particle };
                return <span key={particle} style={style} />;
              })}
            </div>
            <div className="race-bonus-notice-position">
              <div className="race-bonus-notice">
                <ItemIcon aria-hidden="true" />
                <strong>
                  {t(
                    cue.effect === "blocked"
                      ? "blocked"
                      : cue.role === "sender"
                        ? "sent"
                        : cue.effect,
                    { item: items(cue.type) },
                  )}
                </strong>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
