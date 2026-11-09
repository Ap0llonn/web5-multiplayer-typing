"use client";
import { useTranslations } from "next-intl";
import type { RaceSnapshot } from "../../public";

export function RaceBonusLog({
  race,
  playerIdentityId,
}: {
  race: RaceSnapshot;
  playerIdentityId: string;
}) {
  const t = useTranslations("race.items");
  const name = (id: string) =>
    race.players.find((p) => p.playerIdentityId === id)?.displayName ?? "";
  if (!race.settings.bonuses) return null;
  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label={t("events")}
      className="sr-only"
    >
      {race.events
        .filter((event) => event.outcome !== "received")
        .slice(-6)
        .map((event) => (
          <p key={event.id} data-bonus-event={event.outcome}>
            {t(event.outcome, {
              actor: name(event.actorId),
              target: name(event.targetId),
              item: t(event.type),
            })}
            {event.targetId === playerIdentityId && (
              <strong> · {t("you")}</strong>
            )}
          </p>
        ))}
    </div>
  );
}
