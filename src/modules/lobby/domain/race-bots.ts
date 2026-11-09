import type { RaceState } from "../contracts/race";
import { applyRaceItem, distributeMysteryBoxes } from "./race-bonuses";

// Version 1: race ID is the persisted seed; each stroke has its own stable draw.
function draw(seed: string) {
  let hash = 2166136261;
  for (const c of seed)
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  return hash / 4294967296;
}
export function advanceBots(race: RaceState, until: number) {
  while (true) {
    const player = race.players
      .filter(
        (p) =>
          p.kind === "bot" &&
          p.bot &&
          p.status === "TYPING" &&
          p.bot.nextAt <= until,
      )
      .sort(
        (a, b) =>
          (a.bot?.nextAt ?? 0) - (b.bot?.nextAt ?? 0) ||
          a.playerIdentityId.localeCompare(b.playerIdentityId),
      )[0];
    if (!player?.bot) return;
    const bot = player.bot;
    const at = bot.nextAt;
    const seed = `${race.id}:${player.playerIdentityId}:${bot.stroke++}`;
    if (
      race.settings.correction === "required" &&
      !player.text.startsWith(player.draft)
    ) {
      player.draft = player.draft.slice(0, -1);
    } else {
      const expected = player.text[player.draft.length];
      if (expected === undefined) {
        player.status = "FINISHED";
        player.finishedAt = at;
        continue;
      }
      const error =
        draw(`${seed}:error`) < [0.1, 0.07, 0.04, 0.02, 0.01][bot.level - 1];
      player.draft += error ? (expected === "x" ? "y" : "x") : expected;
      player.total++;
      if (error) player.errors++;
      else player.correct++;
    }
    player.progress =
      race.settings.correction === "free"
        ? player.draft.length
        : [...player.draft].findIndex((c, i) => c !== player.text[i]);
    if (player.progress < 0) player.progress = player.draft.length;
    if (player.progress >= player.text.length) {
      player.status = "FINISHED";
      player.finishedAt = at;
    }
    const elapsedMs = at - race.startsAt;
    if (
      !player.samples.length ||
      elapsedMs - player.samples[player.samples.length - 1].elapsedMs >= 1000 ||
      player.status === "FINISHED"
    )
      player.samples.push({
        elapsedMs,
        wpm: elapsedMs > 0 ? (player.correct * 12000) / elapsedMs : 0,
      });
    const wpm = [15, 30, 45, 65, 85][bot.level - 1];
    // Hesitation and long-word/diacritic penalty. Fog delays the next stroke too.
    const currentWord = player.text
      .slice(player.draft.length)
      .split(/\s/, 1)[0];
    const difficult =
      currentWord.length >= 8 ||
      /[^\x00-\x7f]/.test(player.text[player.draft.length] ?? "");
    bot.nextAt =
      at +
      Math.round(
        (12000 / wpm) *
          (0.8 + draw(seed) * 0.4) *
          (difficult ? 1.25 : 1) *
          ((player.fogUntil ?? 0) > at ? 1.5 : 1),
      );
    distributeMysteryBoxes(race, at);
    for (const item of player.items)
      if (item.usedAt === null && player.status === "TYPING")
        applyRaceItem(race, player, item, at);
  }
}
