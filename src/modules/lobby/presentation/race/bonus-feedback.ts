import type { RaceBonusEvent } from "../../public";

export const BONUS_FEEDBACK_MS = 2400;
export type BonusFeedback = {
  id: string;
  type: RaceBonusEvent["type"];
  effect: RaceBonusEvent["type"] | "blocked";
  role: "target" | "sender";
};
function isRecent(event: RaceBonusEvent, now: number) {
  return (
    event.outcome !== "received" &&
    event.at <= now &&
    now - event.at < BONUS_FEEDBACK_MS
  );
}
export function selectBonusFeedback(
  events: RaceBonusEvent[],
  viewer: string,
  now: number,
): BonusFeedback[] {
  const seen = new Set<string>();
  return events
    .filter((event) => {
      if (
        seen.has(event.id) ||
        !isRecent(event, now) ||
        (event.targetId !== viewer && event.actorId !== viewer)
      )
        return false;
      seen.add(event.id);
      return true;
    })
    .slice(-2)
    .map((event) => ({
      id: event.id,
      type: event.type,
      effect: event.outcome === "blocked" ? "blocked" : event.type,
      role: event.targetId === viewer ? "target" : "sender",
    }));
}
export function selectLaneBonusFeedback(
  events: RaceBonusEvent[],
  player: string,
  now: number,
) {
  const event = events.findLast(
    (event) => event.targetId === player && isRecent(event, now),
  );
  return event
    ? {
        id: event.id,
        effect: event.outcome === "blocked" ? ("blocked" as const) : event.type,
      }
    : null;
}
