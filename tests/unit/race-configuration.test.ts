import { describe, expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  snapshot,
} from "@/modules/lobby/domain/lobby-rules";
import {
  configureRace,
  startRace,
  advanceRace,
} from "@/modules/lobby/domain/race-rules";
import {
  raceSettingsSchema,
  raceStateSchema,
} from "@/modules/lobby/contracts/race-schemas";
const host = {
  playerIdentityId: "host",
  kind: "account" as const,
  displayName: "Host",
};
const guest = {
  playerIdentityId: "guest",
  kind: "guest" as const,
  displayName: "Guest",
};
const base = {
  language: "fr" as const,
  wordCount: 10,
  durationSeconds: null,
  correction: "required" as const,
};
function room() {
  const r = createRoom(
    { name: "Config", capacity: 3, role: "PARTICIPANT" },
    host,
    "ABC234",
    0,
  );
  if (!r.ok) throw Error();
  return r.value;
}
describe("race configuration", () => {
  it("atomically configures visibility, capacity and bots only for the host between races", () => {
    const r = room();
    const settings = {
      ...base,
      bots: [{ id: "first", level: 2 as const }],
      capacity: 2,
      visibility: "PUBLIC" as const,
    };
    expect(configureRace(r, guest, settings).ok).toBe(false);
    expect(configureRace(r, host, settings).ok).toBe(true);
    expect(snapshot(r, 0)).toMatchObject({
      capacity: 2,
      visibility: "PUBLIC",
      raceSettings: { bots: [{ id: "first", level: 2 }] },
    });
    expect(joinRoom(r, guest, "PARTICIPANT", 0)).toMatchObject({
      ok: false,
      error: { code: "ROOM_FULL" },
    });
    expect(joinRoom(r, guest, "SPECTATOR", 0).ok).toBe(true);
    const before = structuredClone(r);
    expect(
      configureRace(r, host, {
        ...settings,
        bots: [
          { id: "first", level: 2 },
          { id: "second", level: 3 },
        ],
      }).ok,
    ).toBe(false);
    expect(r).toEqual(before);
    expect(startRace(r, host, "abc", "seed", 0).ok).toBe(true);
    expect(configureRace(r, host, base).ok).toBe(false);
    r.state = "RESULTS";
    expect(configureRace(r, host, { ...base, bots: [] }).ok).toBe(true);
    expect(r.race?.settings.bots).toHaveLength(1);
  });
  it("validates time boundaries, character contradictions, duplicate bots and coherent filters", () => {
    for (const durationSeconds of [null, 30, 600])
      expect(
        raceSettingsSchema.safeParse({ ...base, durationSeconds }).success,
      ).toBe(true);
    for (const durationSeconds of [29, 601, 30.5])
      expect(
        raceSettingsSchema.safeParse({ ...base, durationSeconds }).success,
      ).toBe(false);
    for (const invalid of [
      { mode: "coherent", includeCharacters: "a" },
      { mode: "random", includeCharacters: "a", excludeCharacters: "a" },
      { mode: "random", includeCharacters: "9", numbers: false },
      { bots: [{ id: "one", level: 0 }] },
      {
        bots: [
          { id: "one", level: 1 },
          { id: "one", level: 2 },
        ],
      },
      { capacity: 31 },
      { includeCharacters: "\n" },
    ])
      expect(
        raceSettingsSchema.safeParse({ ...base, ...invalid }).success,
      ).toBe(false);
  });
  it("runs distinct deterministic bot levels without an auth identity and resumes identically after serialization", () => {
    const r = room();
    configureRace(r, host, {
      ...base,
      bots: [
        { id: "slow", level: 1 },
        { id: "fast", level: 5 },
      ],
      bonuses: false,
    });
    expect(startRace(r, host, "a ".repeat(100).trim(), "seed", 0).ok).toBe(
      true,
    );
    expect(
      raceStateSchema.safeParse({ ...r.race, botAlgorithmVersion: 99 }).success,
    ).toBe(false);
    const split = structuredClone(r);
    for (let now = 3100; now <= 13000; now += 100) advanceRace(split, now);
    advanceRace(r, 13000);
    expect(r.race).toEqual(split.race);
    const bots = r.race?.players.filter((p) => p.kind === "bot");
    expect(bots).toHaveLength(2);
    expect(bots?.[1].progress).toBeGreaterThan(bots?.[0].progress ?? 0);
    expect(
      snapshot(r, 13000).race?.players.filter((p) => p.kind === "bot"),
    ).toHaveLength(2);
    const resumed = JSON.parse(JSON.stringify(r));
    advanceRace(resumed, 14000);
    advanceRace(r, 14000);
    expect(resumed.race).toEqual(r.race);
    const spectators = room();
    spectators.members[0].role = "SPECTATOR";
    configureRace(spectators, host, {
      ...base,
      bots: [
        { id: "only", level: 1 },
        { id: "two", level: 2 },
      ],
    });
    expect(startRace(spectators, host, "abc", "seed", 0).ok).toBe(false);
  });
});

it("times out a bot whose next stroke falls exactly on the shared race deadline", () => {
  const r = room();
  configureRace(r, host, {
    ...base,
    durationSeconds: 30,
    bots: [{ id: "boundary", level: 3 }],
  });
  startRace(r, host, "a", "deadline", 0);
  r.members[0].lastSeenAt = 20000;
  const bot = r.race?.players.find((p) => p.kind === "bot");
  if (!bot?.bot) throw Error("Bot missing");
  bot.bot.nextAt = 33000;
  advanceRace(r, 33000);
  expect(bot.status).toBe("TIMEOUT");
  expect(bot.progress).toBe(0);
});
