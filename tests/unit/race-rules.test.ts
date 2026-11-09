import { describe, expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  snapshot,
  leaveRoom,
} from "@/modules/lobby/domain/lobby-rules";
import {
  startRace,
  editRace,
  advanceRace,
  abandonRace,
  configureRace,
  resetRace,
  raceMetrics,
} from "@/modules/lobby/domain/race-rules";
import type { Lobby } from "@/modules/lobby/contracts/lobby";

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
const settings = {
  language: "en" as const,
  wordCount: 10,
  durationSeconds: 30,
  correction: "required" as const,
};
function room(): Lobby {
  const result = createRoom(
    { name: "Race", capacity: 3, role: "PARTICIPANT" },
    host,
    "ABC234",
    0,
  );
  if (!result.ok) throw Error();
  joinRoom(result.value, guest, "PARTICIPANT", 0);
  return result.value;
}
function running(text = "abc") {
  const r = room();
  expect(startRace(r, host, text, "race-1", 0).ok).toBe(true);
  advanceRace(r, 3000);
  return r;
}
describe("server-authoritative race", () => {
  it("allows a spectator host to start with two humans and freezes ranking rules for timeout versus abandonment", () => {
    const r = room();
    r.members[0].role = "SPECTATOR";
    joinRoom(r, { ...guest, playerIdentityId: "third" }, "PARTICIPANT", 0);
    configureRace(r, host, settings);
    expect(startRace(r, host, "abc", "race", 0).ok).toBe(true);
    expect(r.race?.players).toHaveLength(2);
    expect(
      editRace(r, host, { raceId: "race", sequence: 1, edits: ["a"] }, 4000).ok,
    ).toBe(false);
    editRace(
      r,
      guest,
      { raceId: "race", sequence: 1, edits: ["a", "b"] },
      5000,
    );
    abandonRace(r, guest, 6000);
    r.members.forEach((m) => {
      m.lastSeenAt = 20000;
    });
    advanceRace(r, 33000);
    expect(snapshot(r, 33000).race?.players.map((p) => p.status)).toEqual([
      "TIMEOUT",
      "ABANDONED",
    ]);
    expect(snapshot(r, 33000).race?.players[0].progress).toBe(0);
  });
  it("only the current account host starts, with two participants, and freezes the text at a three-second countdown", () => {
    const r = room();
    expect(startRace(r, guest, "abc", "race", 0).ok).toBe(false);
    r.members[1].role = "SPECTATOR";
    expect(startRace(r, host, "abc", "race", 0).ok).toBe(false);
    r.members[1].role = "PARTICIPANT";
    expect(startRace(r, host, "abc", "race", 0).ok).toBe(true);
    expect(r.state).toBe("COUNTDOWN");
    expect(r.race?.startsAt).toBe(3000);
    expect(startRace(r, host, "changed", "other", 1).ok).toBe(false);
    expect(
      editRace(r, host, { raceId: "race", sequence: 1, edits: ["a"] }, 2999).ok,
    ).toBe(false);
    advanceRace(r, 3000);
    expect(r.state).toBe("RACING");
  });
  it("validates configuration and prevents changes after start", () => {
    const r = room();
    expect(configureRace(r, guest, settings).ok).toBe(false);
    expect(
      configureRace(r, host, { ...settings, durationSeconds: 29 }).ok,
    ).toBe(false);
    expect(configureRace(r, host, settings).ok).toBe(true);
    startRace(r, host, "abc", "race", 0);
    expect(configureRace(r, host, settings).ok).toBe(false);
  });
  it("counts errors on the server, blocks required correction, and makes duplicate batches idempotent", () => {
    const r = running();
    expect(
      editRace(
        r,
        host,
        { raceId: "race-1", sequence: 1, edits: ["x", "b"] },
        4000,
      ).ok,
    ).toBe(true);
    expect(r.race?.players[0]).toMatchObject({
      draft: "x",
      total: 1,
      correct: 0,
      errors: 1,
    });
    const batch = {
      raceId: "race-1",
      sequence: 2,
      edits: [null, "a", "b", "c"],
    };
    expect(editRace(r, host, batch, 5000).ok).toBe(true);
    expect(editRace(r, host, batch, 5100).ok).toBe(true);
    expect(r.race?.players[0]).toMatchObject({
      draft: "abc",
      total: 4,
      correct: 3,
      errors: 1,
      status: "FINISHED",
      finishedAt: 5000,
    });
    expect(editRace(r, host, { ...batch, sequence: 4 }, 5200).ok).toBe(false);
    const own = snapshot(r, 5200, "host").race;
    const other = snapshot(r, 5200, "guest").race;
    expect(own?.self?.draft).toBe("abc");
    expect(other?.self?.draft).toBe("");
    expect(JSON.stringify(other?.players)).not.toContain("draft");
  });
  it("free correction advances past errors without inventing correct keystrokes", () => {
    const r = room();
    configureRace(r, host, { ...settings, correction: "free" });
    startRace(r, host, "abc", "race", 0);
    expect(
      editRace(
        r,
        host,
        { raceId: "race", sequence: 1, edits: ["a", "x", "c"] },
        5000,
      ).ok,
    ).toBe(true);
    expect(r.race?.players[0]).toMatchObject({
      status: "FINISHED",
      correct: 2,
      errors: 1,
      progress: 3,
    });
  });
  it("rejects nonparticipants, wrong races, out-of-order batches and impossible speeds atomically", () => {
    const r = running("a".repeat(100));
    joinRoom(r, { ...guest, playerIdentityId: "watcher" }, "SPECTATOR", 3100);
    expect(
      editRace(
        r,
        { ...guest, playerIdentityId: "watcher" },
        { raceId: "race-1", sequence: 1, edits: ["a"] },
        4000,
      ).ok,
    ).toBe(false);
    expect(
      editRace(r, host, { raceId: "old", sequence: 1, edits: ["a"] }, 4000).ok,
    ).toBe(false);
    expect(
      editRace(r, host, { raceId: "race-1", sequence: 2, edits: ["a"] }, 4000)
        .ok,
    ).toBe(false);
    expect(
      editRace(
        r,
        host,
        { raceId: "race-1", sequence: 1, edits: Array<string>(32).fill("a") },
        3001,
      ).ok,
    ).toBe(false);
    expect(r.race?.players[0].draft).toBe("");
  });
  it("ends at the server deadline and ranks finished before timeout before abandoned", () => {
    const r = room();
    configureRace(r, host, settings);
    startRace(r, host, "abc", "race", 0);
    editRace(
      r,
      host,
      { raceId: "race", sequence: 1, edits: ["a", "b", "c"] },
      5000,
    );
    r.members.forEach((m) => {
      m.lastSeenAt = 20000;
    });
    advanceRace(r, 33000);
    expect(r.state).toBe("RESULTS");
    expect(snapshot(r, 33000).race?.players.map((p) => p.status)).toEqual([
      "FINISHED",
      "TIMEOUT",
    ]);
    expect(r.race?.endedAt).toBe(33000);
    expect(resetRace(r, guest, false).ok).toBe(false);
    expect(resetRace(r, host, false).ok).toBe(true);
    expect(r.state).toBe("WAITING");
    expect(r.race).toBeNull();
  });
  it("preserves a place within 30 seconds, abandons after expiry and on voluntary departure", () => {
    const r = running();
    r.members[0].lastSeenAt = 20000;
    advanceRace(r, 30000);
    expect(r.race?.players[1].status).toBe("TYPING");
    advanceRace(r, 30001);
    expect(r.race?.players[1].status).toBe("ABANDONED");
    expect(abandonRace(r, host, 31000).ok).toBe(true);
    expect(r.state).toBe("RESULTS");
    const other = running();
    leaveRoom(other, "guest", 4000);
    advanceRace(other, 4000);
    expect(other.race?.players[1].status).toBe("ABANDONED");
  });
  it("uses the normative net/gross WPM and accuracy formulas without NaN at time zero", () => {
    expect(raceMetrics({ correct: 50, total: 60, errors: 10 }, 60000)).toEqual({
      wpm: 10,
      grossWpm: 12,
      accuracy: (50 / 60) * 100,
    });
    expect(raceMetrics({ correct: 0, total: 0, errors: 0 }, 0)).toEqual({
      wpm: 0,
      grossWpm: 0,
      accuracy: 100,
    });
  });
});
