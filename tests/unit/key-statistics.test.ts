import { expect, it } from "vitest";
import { createRoom, joinRoom } from "@/modules/lobby/domain/lobby-rules";
import {
  startRace,
  editRace,
  advanceRace,
} from "@/modules/lobby/domain/race-rules";
import {
  recordKeyStatistic,
  mergeKeyStatistics,
} from "@/modules/lobby/domain/key-statistics";
import { keyStatisticsSchema } from "@/modules/lobby/contracts/key-statistics";

it.each(["required", "free"] as const)(
  "counts accepted insertions only in %s, retaining corrected errors and ignoring retries",
  (correction) => {
    const host = {
      playerIdentityId: "host",
      kind: "account" as const,
      displayName: "Host",
    };
    const r = createRoom(
      { name: "Keys", capacity: 2, role: "PARTICIPANT" },
      host,
      "ABC234",
      0,
    );
    if (!r.ok) throw Error();
    joinRoom(r.value, { ...host, playerIdentityId: "guest" }, "PARTICIPANT", 0);
    startRace(r.value, host, "abc", "race", 0);
    const race = r.value.race;
    if (!race) throw Error();
    race.settings.correction = correction;
    advanceRace(r.value, 3000);
    const input = { raceId: "race", sequence: 1, edits: ["X", null, "a", "b"] };
    expect(editRace(r.value, host, input, 4000).ok).toBe(true);
    expect(editRace(r.value, host, input, 4100).ok).toBe(true);
    expect(race.players[0].keyStatistics).toEqual([
      { key: "x", total: 1, errors: 1 },
      { key: "a", total: 1, errors: 0 },
      { key: "b", total: 1, errors: 0 },
    ]);
  },
);
it("merges normalized characters, preserves accents and space, and validates counters", () => {
  expect(
    mergeKeyStatistics([
      [
        { key: "é", total: 2, errors: 1 },
        { key: " ", total: 1, errors: 0 },
      ],
      [{ key: "é", total: 3, errors: 1 }],
    ]),
  ).toEqual([
    { key: " ", total: 1, errors: 0 },
    { key: "é", total: 5, errors: 2 },
  ]);
  expect(
    keyStatisticsSchema.safeParse([{ key: "a", total: 1, errors: 2 }]).success,
  ).toBe(false);
  expect(
    keyStatisticsSchema.safeParse([{ key: "draft", total: 1, errors: 0 }])
      .success,
  ).toBe(false);
});

it("retains single-character keys when lowercase expands Unicode", () => {
  const entries: { key: string; total: number; errors: number }[] = [];
  recordKeyStatistic(entries, "İ", false);
  expect(keyStatisticsSchema.safeParse(entries).success).toBe(true);
  expect(entries[0].total).toBe(1);
});
