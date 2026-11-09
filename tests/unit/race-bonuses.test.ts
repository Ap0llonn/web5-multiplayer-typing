import { describe, expect, it } from "vitest";
import { createRoom, joinRoom } from "@/modules/lobby/domain/lobby-rules";
import {
  advanceRace,
  configureRace,
  editRace,
  raceMetrics,
  raceSnapshot,
  startRace,
  useRaceItem,
} from "@/modules/lobby/domain/race-rules";
import { distributeMysteryBoxes } from "@/modules/lobby/domain/race-bonuses";
import { raceStateSchema } from "@/modules/lobby/contracts/race-schemas";
import type { RaceItemType, RaceState } from "@/modules/lobby/contracts/race";

const host = {
  playerIdentityId: "host",
  displayName: "Host",
  kind: "account" as const,
};
const guest = {
  playerIdentityId: "guest",
  displayName: "Guest",
  kind: "guest" as const,
};
const text =
  "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima";
function running(bonuses = true) {
  const result = createRoom(
    { name: "Boxes", capacity: 4, role: "PARTICIPANT" },
    host,
    "ABC234",
    0,
  );
  if (!result.ok) throw Error("room");
  const room = result.value;
  joinRoom(room, guest, "PARTICIPANT", 0);
  joinRoom(room, { ...guest, playerIdentityId: "watcher" }, "SPECTATOR", 0);
  configureRace(room, host, {
    language: "en",
    wordCount: 12,
    durationSeconds: null,
    correction: "required",
    bonuses,
  });
  startRace(room, host, text, "mystery-race", 0);
  advanceRace(room, 3000);
  if (!room.race) throw Error("race");
  room.race.bonusRulesVersion = 1; // Existing races keep their original allocation rules.
  return { room, race: room.race };
}
function give(race: RaceState, type: RaceItemType, player = race.players[1]) {
  const item = {
    id: `${type}-${player.items.length}`,
    type,
    checkpoint: 25 as const,
    receivedAt: 4000,
    usedAt: null,
  };
  player.items.push(item);
  player.bonusesReceived++;
  return { raceId: race.id, itemId: item.id };
}

describe("mystery boxes", () => {
  it("awards only trailing racers at 25/50/75, handles skipped thresholds once and caps at three", () => {
    const { race } = running();
    race.players[0].progress = Math.floor(text.length * 0.24);
    distributeMysteryBoxes(race, 4000);
    expect(race.players[1].items).toHaveLength(0);
    race.players[0].progress = Math.ceil(text.length * 0.76);
    distributeMysteryBoxes(race, 4100);
    expect(race.checkpoints).toEqual([25, 50, 75]);
    expect(race.players[1].items).toHaveLength(3);
    expect(race.players[0].items).toHaveLength(0);
    distributeMysteryBoxes(race, 4200);
    race.players[0].progress = 0;
    distributeMysteryBoxes(race, 4300);
    race.players[0].progress = text.length;
    distributeMysteryBoxes(race, 4400);
    expect(race.players[1].bonusesReceived).toBe(3);
    expect(new Set(race.players[1].items.map((i) => i.id)).size).toBe(3);
    expect(race.players).toHaveLength(2);
  });
  it("includes tied last places and gaps strictly over 25 points, excludes ties with the leader and abandoned racers", () => {
    const { race } = running();
    const last = structuredClone(race.players[1]);
    last.playerIdentityId = "third";
    race.players.push(last);
    race.players[0].progress = text.length * 0.5;
    race.players[1].progress = text.length * 0.25;
    distributeMysteryBoxes(race, 4000);
    expect(race.players[1].items).toHaveLength(0); // gap exactly 25, not last
    expect(last.items).toHaveLength(2);
    race.players[0].progress = text.length * 0.75;
    race.players[1].progress = text.length * 0.49;
    distributeMysteryBoxes(race, 4100);
    expect(race.players[1].items).toHaveLength(1); // more than 25, not last
    const equal = running().race;
    equal.players.forEach((p) => {
      p.progress = text.length / 2;
    });
    distributeMysteryBoxes(equal, 4000);
    expect(equal.players.every((p) => p.items.length === 0)).toBe(true);
    const tied = running().race;
    tied.players.push({
      ...structuredClone(tied.players[1]),
      playerIdentityId: "third",
    });
    tied.players[0].progress = text.length / 2;
    distributeMysteryBoxes(tied, 4000);
    expect(tied.players.slice(1).every((p) => p.items.length === 2)).toBe(true);
    const abandoned = running().race;
    abandoned.players[1].status = "ABANDONED";
    abandoned.players[0].progress = text.length;
    distributeMysteryBoxes(abandoned, 4000);
    expect(abandoned.players[1].items).toHaveLength(0);
  });
  it("disables boxes and replays the same weighted draw from persisted race state", () => {
    const disabled = running(false).race;
    disabled.players[0].progress = text.length;
    distributeMysteryBoxes(disabled, 4000);
    expect(disabled.checkpoints).toEqual([]);
    const first = running().race;
    first.players[0].progress = text.length / 2;
    const replay = structuredClone(first);
    distributeMysteryBoxes(first, 4000);
    distributeMysteryBoxes(replay, 4000);
    expect(first).toEqual(replay);
  });
  it("can draw all six effects when useful and never draws clear skies without fog", () => {
    const effects = new Set<RaceItemType>();
    for (let index = 0; index < 200; index++) {
      const { race } = running();
      race.id = `server-race-${index}`;
      race.players[0].progress = text.length / 4;
      race.players[1].fogUntil = 8000;
      distributeMysteryBoxes(race, 4000);
      effects.add(race.players[1].items[0].type);
      const clearWeather = running().race;
      clearWeather.id = race.id;
      clearWeather.players[0].progress = text.length / 4;
      distributeMysteryBoxes(clearWeather, 4000);
      expect(clearWeather.players[1].items[0].type).not.toBe("clear");
    }
    expect([...effects].sort()).toEqual([
      "clear",
      "detour",
      "fog",
      "nudge",
      "shield",
      "shortcut",
    ]);
  });
  it("does not round an exact 25-point gap into eligibility", () => {
    const { race } = running();
    race.players.forEach((player) => {
      player.text = "a".repeat(100);
    });
    race.players[0].progress = 55;
    race.players[1].progress = 30;
    race.players.push({
      ...structuredClone(race.players[1]),
      playerIdentityId: "last",
      progress: 0,
    });
    distributeMysteryBoxes(race, 4000);
    expect(race.players[1].items).toHaveLength(0);
    expect(race.players[2].items).toHaveLength(2);
  });
  for (const [type, removed] of [
    ["shortcut", 3],
    ["nudge", 1],
  ] as const)
    it(`${type} removes only unstarted words, preserves drafts and actual WPM, and rejects old typing revisions`, () => {
      const { room, race } = running();
      const player = race.players[1];
      player.draft = "alp";
      player.progress = player.correct = player.total = 3;
      const before = raceMetrics(player, 60000);
      const input = give(race, type);
      expect(useRaceItem(room, guest, input, 5000).ok).toBe(true);
      expect(player.text.split(" ")).toHaveLength(
        text.split(" ").length - removed,
      );
      expect(player.text.startsWith("alpha ")).toBe(true);
      expect(player.draft).toBe("alp");
      expect(player.textRevision).toBe(1);
      expect(raceMetrics(player, 60000)).toEqual(before);
      expect(
        editRace(
          room,
          guest,
          { raceId: race.id, sequence: 1, textRevision: 0, edits: ["h"] },
          6000,
        ),
      ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
      expect(player.errors).toBe(0);
      expect(
        editRace(
          room,
          guest,
          { raceId: race.id, sequence: 1, textRevision: 1, edits: ["h"] },
          6000,
        ).ok,
      ).toBe(true);
      expect(race.players[1].draft).toBe("alph");
      const snap = raceSnapshot(room, 6000, "guest");
      expect(snap?.self?.text).toBe(player.text);
      expect(
        snap?.players.find((p) => p.playerIdentityId === "guest")?.targetLength,
      ).toBe(player.text.length);
    });
  it("detour adds three words to the current leader and fog expires after four seconds", () => {
    const { room, race } = running();
    race.players[0].progress = 5;
    const detour = give(race, "detour");
    expect(useRaceItem(room, guest, detour, 5000).ok).toBe(true);
    expect(race.players[0].text.split(" ")).toHaveLength(
      text.split(" ").length + 3,
    );
    expect(race.players[0].text.startsWith(text)).toBe(true);
    expect(race.players[0].textRevision).toBe(1);
    const fog = give(race, "fog");
    expect(useRaceItem(room, guest, fog, 6000).ok).toBe(true);
    expect(race.players[0].fogUntil).toBe(10000);
    advanceRace(room, 9999);
    expect(race.players[0].fogUntil).toBe(10000);
    advanceRace(room, 10000);
    expect(race.players[0].fogUntil).toBeNull();
  });
  it("shield absorbs exactly one attack and clear removes the owner's fog", () => {
    const { room, race } = running();
    race.players[0].progress = 5;
    expect(
      useRaceItem(room, host, give(race, "shield", race.players[0]), 5000).ok,
    ).toBe(true);
    expect(useRaceItem(room, guest, give(race, "detour"), 5100).ok).toBe(true);
    expect(race.players[0]).toMatchObject({
      shield: false,
      text,
      textRevision: 0,
    });
    expect(race.events.at(-1)?.outcome).toBe("blocked");
    expect(useRaceItem(room, guest, give(race, "fog"), 5200).ok).toBe(true);
    expect(
      useRaceItem(room, host, give(race, "clear", race.players[0]), 5300).ok,
    ).toBe(true);
    expect(race.players[0].fogUntil).toBeNull();
  });
  it("validates ownership, race, status and utility; duplicate activation has no second effect", () => {
    const { room, race } = running();
    const input = give(race, "shortcut");
    expect(useRaceItem(room, host, input, 5000)).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(useRaceItem(room, guest, { ...input, raceId: "old" }, 5000).ok).toBe(
      false,
    );
    expect(useRaceItem(room, guest, input, 5000).ok).toBe(true);
    const after = structuredClone(race);
    expect(useRaceItem(room, guest, input, 5100).ok).toBe(true);
    expect(race).toEqual(after);
    const useless = give(race, "clear");
    expect(useRaceItem(room, guest, useless, 5200).ok).toBe(false);
    expect(race.players[1].items.at(-1)?.usedAt).toBeNull();
    race.players[0].status = "FINISHED";
    expect(useRaceItem(room, guest, give(race, "detour"), 5300).ok).toBe(false);
    race.players[1].status = "ABANDONED";
    expect(useRaceItem(room, guest, give(race, "shield"), 5400).ok).toBe(false);
  });
  it("keeps a last word to type and ranks players by their personal target lengths", () => {
    const { room, race } = running();
    const player = race.players[1];
    player.draft = text.slice(0, text.lastIndexOf(" ") + 2);
    player.progress = player.draft.length;
    expect(useRaceItem(room, guest, give(race, "shortcut"), 5000).ok).toBe(
      false,
    );
    expect(player.status).toBe("TYPING");
    player.text = text.slice(0, 20);
    player.progress = 10;
    race.players[0].progress = 15;
    expect(raceSnapshot(room, 5000)?.players[0].playerIdentityId).toBe("guest");
  });
  for (const type of ["shortcut", "nudge"] as const)
    it(`${type} keeps a word to finish when activation occurs exactly at a word boundary`, () => {
      const { room, race } = running();
      const player = race.players[1];
      player.text = "alpha bravo";
      player.draft = "alpha";
      player.progress = 5;
      expect(useRaceItem(room, guest, give(race, type), 5000).ok).toBe(false);
      expect(player.text).toBe("alpha bravo");
      expect(player.text.length).toBeGreaterThan(player.draft.length);
      expect(player.items[0].usedAt).toBeNull();
    });
  it("loads legacy aggregates with unchanged text and bonuses disabled", () => {
    const { race } = running();
    const legacy = JSON.parse(JSON.stringify(race)) as Record<string, unknown>;
    delete legacy.checkpoints;
    delete legacy.events;
    legacy.settings = {
      language: "en",
      wordCount: 12,
      durationSeconds: null,
      correction: "required",
    };
    legacy.players = race.players.map(
      ({
        playerIdentityId,
        kind,
        displayName,
        character,
        draft,
        sequence,
        progress,
        correct,
        total,
        errors,
        status,
        finishedAt,
        lastEditAt,
        budget,
        samples,
      }) => ({
        playerIdentityId,
        kind,
        displayName,
        character,
        draft,
        sequence,
        progress,
        correct,
        total,
        errors,
        status,
        finishedAt,
        lastEditAt,
        budget,
        samples,
      }),
    );
    const parsed = raceStateSchema.parse(legacy);
    expect(parsed.settings.bonuses).toBe(false);
    expect(parsed.players[0]).toMatchObject({
      text,
      textRevision: 0,
      items: [],
      bonusesReceived: 0,
      fogUntil: null,
      shield: false,
    });
  });
});
