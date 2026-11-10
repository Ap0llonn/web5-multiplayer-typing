import { describe, expect, it } from "vitest";
import { createRoom, joinRoom } from "@/modules/lobby/domain/lobby-rules";
import {
  startRace,
  advanceRace,
  raceSnapshot,
  raceMetrics,
} from "@/modules/lobby/domain/race-rules";
import {
  distributeMysteryBoxes,
  applyRaceItem,
} from "@/modules/lobby/domain/race-bonuses";
import { raceStateSchema } from "@/modules/lobby/contracts/race-schemas";

const host = {
  playerIdentityId: "host",
  kind: "account" as const,
  displayName: "Host",
};
function raceWith(count = 3) {
  const result = createRoom(
    { name: "Personal boxes", capacity: 10, role: "PARTICIPANT" },
    host,
    "ABC234",
    0,
  );
  if (!result.ok) throw Error();
  for (let i = 1; i < count; i++)
    joinRoom(
      result.value,
      {
        playerIdentityId: `guest-${i}`,
        kind: "guest",
        displayName: `Guest ${i}`,
      },
      "PARTICIPANT",
      0,
    );
  startRace(
    result.value,
    host,
    Array<string>(100).fill("alpha").join(" "),
    "personal-boxes",
    0,
  );
  if (!result.value.race) throw Error();
  return { room: result.value, race: result.value.race };
}
describe("personal race boxes", () => {
  it("automatically consumes useful items when resuming historical allocation rules too", () => {
    const { room, race } = raceWith();
    race.bonusRulesVersion = 1;
    race.players[0].progress = Math.ceil(race.text.length * 0.26);
    advanceRace(room, 4000);
    expect(race.players[1].items).toHaveLength(1);
    expect(race.players[1].items[0].usedAt).toBe(4000);
  });
  it("applies each personal box on collection, without a client command, and never replays it", () => {
    const { race } = raceWith();
    const player = race.players[0];
    player.progress = Math.ceil(player.text.length * 0.26);
    player.draft = player.text.slice(0, player.progress);
    player.total = player.correct = player.progress;
    const stats = raceMetrics(player, 60000);
    distributeMysteryBoxes(race, 4000);
    expect(player.items[0].usedAt).toBe(4000);
    expect(race.events.map((event) => event.outcome)).toEqual([
      "received",
      "applied",
    ]);
    expect(race.events[1].at).toBe(race.events[0].at);
    expect(raceMetrics(player, 60000)).toEqual(stats);
    const restored = raceStateSchema.parse(JSON.parse(JSON.stringify(race)));
    distributeMysteryBoxes(restored, 4100);
    expect(restored.events).toEqual(race.events);
    expect(restored.players[1].items).toEqual([]);
  });
  it("never leaves a newly collected item waiting, including simultaneous fog and shockwave draws", () => {
    for (let seed = 0; seed < 80; seed++) {
      const { race } = raceWith(10);
      race.id = `auto-${seed}`;
      race.players.forEach((player, index) => {
        player.progress = Math.ceil(player.text.length * (0.8 - index * 0.06));
        player.draft = player.text.slice(0, player.progress);
      });
      distributeMysteryBoxes(race, 4000);
      for (const player of race.players)
        for (const item of player.items) {
          expect(item.usedAt).toBe(4000);
          expect(
            race.events.filter((e) => e.id === `${item.id}:used`),
          ).toHaveLength(1);
        }
    }
  });
  it("lets each racer collect a checkpoint independently, once, including after reload", () => {
    const { race } = raceWith();
    race.players[0].progress = Math.ceil(race.text.length * 0.26);
    distributeMysteryBoxes(race, 4000);
    expect(race.players[1].items).toHaveLength(0);
    expect(race.players[0].items).toHaveLength(1);
    race.players[1].progress = Math.ceil(race.text.length * 0.26);
    distributeMysteryBoxes(race, 4100);
    expect(race.players[0].items).toHaveLength(1);
    expect(race.players[1].items).toHaveLength(1);
    expect(race.players[2].items).toHaveLength(0);
    const restored = raceStateSchema.parse(JSON.parse(JSON.stringify(race)));
    distributeMysteryBoxes(restored, 4200);
    expect(restored.players.map((p) => p.items.length)).toEqual([1, 1, 0]);
    restored.players[1].progress = Math.ceil(race.text.length * 0.76);
    distributeMysteryBoxes(restored, 4300);
    expect(restored.players[1].items).toHaveLength(3);
    expect(restored.players[0].items).toHaveLength(1);
  });
  it("gives second place weaker draws and reserves the strong catch-up for racers near the back", () => {
    let catchUps = 0;
    for (let seed = 0; seed < 120; seed++) {
      const { race } = raceWith(10);
      race.id = `seed-${seed}`;
      race.players.forEach(
        (p, i) => (p.progress = Math.floor(p.text.length * (0.95 - i * 0.07))),
      );
      distributeMysteryBoxes(race, 4000);
      const second = race.players[1].items[0];
      expect(second).toBeDefined();
      expect(second.type).not.toBe("catchup");
      expect(second.strength).toBe(1);
      if (race.players[9].items[0]?.type === "catchup") catchUps++;
    }
    expect(catchUps).toBeGreaterThan(0);
  });
  it("moves tenth toward fifth by removing only unstarted words without inventing progress or WPM", () => {
    const { race, room } = raceWith(10);
    const positions = [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.25];
    race.players.forEach((p, i) => {
      p.progress = Math.floor(p.text.length * positions[i]);
      p.draft = p.text.slice(0, p.progress);
      p.total = p.correct = p.progress;
    });
    const last = race.players[9];
    const before = {
      draft: last.draft,
      progress: last.progress,
      metrics: raceMetrics(last, 60000),
    };
    const item = {
      id: "catch-up",
      type: "catchup" as const,
      checkpoint: 25 as const,
      receivedAt: 4000,
      usedAt: null,
    };
    last.items.push(item);
    expect(applyRaceItem(race, last, item, 5000).ok).toBe(true);
    expect(
      raceSnapshot(room, 5000)?.players.find(
        (p) => p.playerIdentityId === last.playerIdentityId,
      )?.rank,
    ).toBe(5);
    expect(last.draft).toBe(before.draft);
    expect(last.progress).toBe(before.progress);
    expect(last.text.startsWith(last.draft)).toBe(true);
    expect(last.text.length).toBeGreaterThan(last.draft.length);
    expect(last.status).toBe("TYPING");
    expect(raceMetrics(last, 60000)).toEqual(before.metrics);
    expect(last.textRevision).toBe(1);
  });
  it("does not let a stored catch-up jump a racer from second place into first", () => {
    const { race } = raceWith(3);
    race.players[0].progress = Math.floor(race.text.length * 0.8);
    race.players[1].progress = Math.floor(race.text.length * 0.7);
    const item = {
      id: "held",
      type: "catchup" as const,
      checkpoint: 25 as const,
      receivedAt: 4000,
      usedAt: null,
    };
    expect(applyRaceItem(race, race.players[1], item, 5000).ok).toBe(false);
    expect(item.usedAt).toBeNull();
  });
});

it("keeps a front-runner's attack small while allowing a close second to challenge the leader", () => {
  const { room, race } = raceWith();
  const leader = race.players[0];
  const second = race.players[1];
  leader.progress = Math.floor(leader.text.length * 0.9);
  second.progress = Math.floor(second.text.length * 0.895);
  const progress = second.progress;
  const item = {
    id: "light-attack",
    type: "detour" as const,
    strength: 1 as const,
    checkpoint: 25 as const,
    receivedAt: 4000,
    usedAt: null,
  };
  expect(applyRaceItem(race, second, item, 5000).ok).toBe(true);
  expect(leader.text.split(" ")).toHaveLength(102);
  expect(second.progress).toBe(progress);
  expect(raceSnapshot(room, 5000)?.players[0].playerIdentityId).toBe(
    second.playerIdentityId,
  );
  expect(second.status).toBe("TYPING");
});
