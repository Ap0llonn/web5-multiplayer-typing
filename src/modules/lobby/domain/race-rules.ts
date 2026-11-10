import type { RaceState } from "../contracts/race";

import {
  failure,
  success,
  type OperationResult,
} from "@/shared/contracts/operation-result";
import type { Lobby, LobbyActor } from "../contracts/lobby";
import type {
  RaceEditInput,
  RaceMetrics,
  RacePlayer,
  RaceSettings,
  RaceSnapshot,
  RaceUseItemInput,
} from "../contracts/race";
import {
  raceEditSchema,
  raceSettingsSchema,
  raceUseItemSchema,
} from "../contracts/race-schemas";
import { advanceBots } from "./race-bots";
import { PRESENCE_GRACE_MS } from "../contracts/presence";
import {
  applyRaceItem,
  distributeMysteryBoxes,
  raceProgress,
} from "./race-bonuses";

export const DEFAULT_RACE_SETTINGS: RaceSettings = {
  language: "fr",
  wordCount: 30,
  durationSeconds: 120,
  correction: "required",
  bonuses: true,
};
function isHost(room: Lobby, actor: LobbyActor) {
  return (
    actor.kind === "account" &&
    room.hostPlayerIdentityId === actor.playerIdentityId &&
    room.members.some((m) => m.playerIdentityId === actor.playerIdentityId)
  );
}
export function raceMetrics(
  player: Pick<RacePlayer, "correct" | "total" | "errors">,
  elapsedMs: number,
): RaceMetrics {
  const minutes = elapsedMs / 60000;
  return {
    wpm: minutes > 0 ? player.correct / 5 / minutes : 0,
    grossWpm: minutes > 0 ? player.total / 5 / minutes : 0,
    accuracy: player.total ? (player.correct / player.total) * 100 : 100,
  };
}
export function configureRace(
  room: Lobby,
  actor: LobbyActor,
  input: RaceSettings,
): OperationResult<Lobby> {
  if (!isHost(room, actor)) return failure("FORBIDDEN");
  if (!["WAITING", "RESULTS"].includes(room.state)) return failure("CONFLICT");
  const parsed = raceSettingsSchema.safeParse(input);
  if (!parsed.success) return failure("VALIDATION");
  const capacity = parsed.data.capacity ?? room.capacity;
  if (
    room.members.filter((m) => m.role === "PARTICIPANT").length +
      parsed.data.bots.length >
    capacity
  )
    return failure("ROOM_FULL");
  room.capacity = capacity;
  room.visibility = parsed.data.visibility ?? room.visibility;
  room.raceSettings = parsed.data;
  return success(room);
}
export function startRace(
  room: Lobby,
  actor: LobbyActor,
  text: string,
  id: string,
  now: number,
): OperationResult<Lobby> {
  if (!isHost(room, actor)) return failure("FORBIDDEN");
  if (room.state !== "WAITING") return failure("CONFLICT");
  const members = room.members.filter(
    (m) => m.role === "PARTICIPANT" && now - m.lastSeenAt <= PRESENCE_GRACE_MS,
  );
  const bots = room.raceSettings?.bots ?? [];
  if (!members.length || members.length + bots.length < 2)
    return failure("CONFLICT");
  if (!text.trim()) return failure("VALIDATION");
  const settings = { ...DEFAULT_RACE_SETTINGS, ...room.raceSettings };
  room.race = {
    botAlgorithmVersion: 1,
    bonusRulesVersion: 2,
    id,
    text,
    settings,
    startsAt: now + 3000,
    endedAt: null,
    checkpoints: [],
    events: [],
    players: [
      ...members,
      ...bots.map((bot, index) => ({
        playerIdentityId: `bot:${room.id}:${bot.id}`,
        kind: "bot" as const,
        displayName: `Bot ${index + 1}`,
        character: (["cobalt", "coral", "mint", "butter"] as const)[index % 4],
        bot: { level: bot.level, nextAt: now + 3100, stroke: 0 },
      })),
    ].map((m) => ({
      playerIdentityId: m.playerIdentityId,
      kind: m.kind,
      ...("bot" in m ? { bot: m.bot } : {}),
      displayName: m.displayName,
      character: m.character,
      draft: "",
      sequence: 0,
      progress: 0,
      total: 0,
      correct: 0,
      errors: 0,
      status: "TYPING",
      finishedAt: null,
      lastEditAt: now + 3000,
      budget: 8,
      samples: [],
      text,
      textRevision: 0,
      items: [],
      boxCheckpoints: [],
      bonusesReceived: 0,
      fogUntil: null,
      shield: false,
    })),
  };
  room.state = "COUNTDOWN";
  return success(room);
}
export function advanceRace(room: Lobby, now: number): Lobby {
  const race = room.race;
  if (!race || race.endedAt !== null) return room;
  const deadline =
    race.settings.durationSeconds === null
      ? Infinity
      : race.startsAt + race.settings.durationSeconds * 1000;
  if (now >= race.startsAt && room.state === "COUNTDOWN") room.state = "RACING";
  if (room.state === "RACING") advanceBots(race, Math.min(now, deadline - 1));
  for (const player of race.players) {
    if (player.fogUntil !== null && now >= player.fogUntil)
      player.fogUntil = null;
    if (player.status !== "TYPING") continue;
    const member = room.members.find(
      (m) => m.playerIdentityId === player.playerIdentityId,
    );
    const expiry = member ? member.lastSeenAt + PRESENCE_GRACE_MS : now;
    if (
      room.state === "CLOSED" ||
      (player.kind !== "bot" && !member) ||
      (player.kind !== "bot" && now > expiry && expiry < deadline)
    ) {
      player.status = "ABANDONED";
      player.finishedAt = Math.max(race.startsAt, Math.min(now, expiry));
    } else if (now >= deadline) {
      player.status = "TIMEOUT";
      player.finishedAt = deadline;
    }
  }
  if (room.state === "RACING" && now < deadline) {
    distributeMysteryBoxes(race, now);
    // Historical races keep their allocation, but no longer need a manual UI.
    if ((race.bonusRulesVersion ?? 1) === 1)
      for (const player of race.players)
        if (player.status === "TYPING")
          for (const item of player.items)
            if (item.usedAt === null && item.receivedAt <= now)
              applyRaceItem(race, player, item, now);
  }
  if (race.players.every((p) => p.status !== "TYPING")) {
    race.endedAt = Math.max(...race.players.map((p) => p.finishedAt ?? now));
    if (room.state !== "CLOSED") room.state = "RESULTS";
  }
  return room;
}
export function raceNeedsAdvance(room: Lobby, now: number) {
  if (!room.race || room.race.endedAt !== null) return false;
  const copy: Lobby = structuredClone(room);
  advanceRace(copy, now);
  return (
    JSON.stringify(copy.race) !== JSON.stringify(room.race) ||
    copy.state !== room.state
  );
}
export function editRace(
  room: Lobby,
  actor: LobbyActor,
  input: RaceEditInput,
  now: number,
): OperationResult<Lobby> {
  const parsed = raceEditSchema.safeParse(input);
  if (!parsed.success) return failure("VALIDATION");
  advanceRace(room, now);
  const race = room.race;
  if (!race || race.id !== input.raceId) return failure("CONFLICT");
  const player = race.players.find(
    (p) => p.playerIdentityId === actor.playerIdentityId,
  );
  if (
    !player ||
    !room.members.some((m) => m.playerIdentityId === actor.playerIdentityId)
  )
    return failure("FORBIDDEN");
  if (input.sequence === player.sequence) return success(room);
  if (
    input.sequence !== player.sequence + 1 ||
    room.state !== "RACING" ||
    player.status !== "TYPING"
  )
    return failure("CONFLICT");
  if (parsed.data.textRevision !== player.textRevision)
    return failure("CONFLICT");
  if (now - player.lastEditAt < 80) return failure("RATE_LIMITED");
  const updated = structuredClone(player);
  const inserts = input.edits.filter((e) => e !== null).length;
  const available = Math.min(
    32,
    updated.budget + (Math.max(0, now - updated.lastEditAt) * 30) / 1000,
  );
  if (
    inserts > available ||
    updated.total + inserts > 8 + ((now - race.startsAt) * 30) / 1000
  )
    return failure("RATE_LIMITED");
  for (const edit of input.edits) {
    if (edit === null) {
      updated.draft = updated.draft.slice(0, -1);
      continue;
    }
    if (updated.draft.length >= updated.text.length) continue;
    if (
      race.settings.correction === "required" &&
      !updated.text.startsWith(updated.draft)
    )
      continue;
    const correct = updated.text[updated.draft.length] === edit;
    updated.draft += edit;
    updated.total++;
    if (correct) updated.correct++;
    else updated.errors++;
  }
  updated.progress =
    race.settings.correction === "free"
      ? updated.draft.length
      : [...updated.draft].findIndex((c, i) => c !== updated.text[i]);
  if (updated.progress === -1) updated.progress = updated.draft.length;
  updated.sequence = input.sequence;
  updated.budget = available - inserts;
  updated.lastEditAt = now;
  if (updated.progress === updated.text.length) {
    updated.status = "FINISHED";
    updated.finishedAt = now;
  }
  const elapsedMs = now - race.startsAt;
  if (
    !updated.samples.length ||
    elapsedMs - updated.samples[updated.samples.length - 1].elapsedMs >= 1000 ||
    updated.status === "FINISHED"
  )
    updated.samples.push({
      elapsedMs,
      wpm: raceMetrics(updated, elapsedMs).wpm,
    });
  race.players[race.players.indexOf(player)] = updated;
  advanceRace(room, now);
  return success(room);
}
export function useRaceItem(
  room: Lobby,
  actor: LobbyActor,
  input: RaceUseItemInput,
  now: number,
): OperationResult<Lobby> {
  const parsed = raceUseItemSchema.safeParse(input);
  if (!parsed.success) return failure("VALIDATION");
  advanceRace(room, now);
  const race = room.race;
  if (!race || race.id !== parsed.data.raceId) return failure("CONFLICT");
  const player = race.players.find(
    (p) => p.playerIdentityId === actor.playerIdentityId,
  );
  if (
    !player ||
    !room.members.some((m) => m.playerIdentityId === actor.playerIdentityId)
  )
    return failure("FORBIDDEN");
  const item = player.items.find((i) => i.id === parsed.data.itemId);
  if (!item) return failure("FORBIDDEN");
  if (item.usedAt !== null) return success(room);
  if (
    room.state !== "RACING" ||
    player.status !== "TYPING" ||
    !race.settings.bonuses
  )
    return failure("CONFLICT");
  const result = applyRaceItem(race, player, item, now);
  if (!result.ok) return result;
  advanceRace(room, now);
  return success(room);
}
export function abandonRace(
  room: Lobby,
  actor: LobbyActor,
  now: number,
): OperationResult<Lobby> {
  advanceRace(room, now);
  const player = room.race?.players.find(
    (p) => p.playerIdentityId === actor.playerIdentityId,
  );
  if (
    !player ||
    !room.members.some((m) => m.playerIdentityId === actor.playerIdentityId)
  )
    return failure("FORBIDDEN");
  if (player.status !== "TYPING") return success(room);
  player.status = "ABANDONED";
  player.finishedAt = Math.max(room.race?.startsAt ?? now, now);
  advanceRace(room, now);
  return success(room);
}
export function resetRace(
  room: Lobby,
  actor: LobbyActor,
  close: boolean,
): OperationResult<Lobby> {
  if (!isHost(room, actor)) return failure("FORBIDDEN");
  if (room.state !== "RESULTS" && !(close && room.state === "WAITING"))
    return failure("CONFLICT");
  room.state = close ? "CLOSED" : "WAITING";
  room.race = null;
  if (close) room.members = [];
  return success(room);
}
export function raceSnapshot(
  room: Lobby,
  now: number,
  viewer?: string,
): RaceSnapshot | null {
  const race = room.race;
  if (!race) return null;
  const players = raceStandings(race, now);
  const self = race.players.find((p) => p.playerIdentityId === viewer);
  return {
    id: race.id,
    bonusRulesVersion: race.bonusRulesVersion ?? 1,
    text: race.text,
    startsAt: race.startsAt,
    endedAt: race.endedAt,
    serverNow: now,
    settings: race.settings,
    players,
    checkpoints: race.checkpoints,
    events: race.events,
    self: self
      ? {
          draft: self.draft,
          sequence: self.sequence,
          text: self.text,
          textRevision: self.textRevision,
          items: self.items.filter((item) => item.usedAt === null),
        }
      : null,
  };
}

export function rankedRacePlayers(race: RaceState) {
  const order = { FINISHED: 0, TYPING: 1, TIMEOUT: 2, ABANDONED: 3 };
  return [...race.players].sort(
    (a, b) =>
      order[a.status] - order[b.status] ||
      (a.status === "FINISHED"
        ? (a.finishedAt ?? 0) - (b.finishedAt ?? 0)
        : raceProgress(b) - raceProgress(a)) ||
      a.playerIdentityId.localeCompare(b.playerIdentityId),
  );
}

export function raceStandings(race: RaceState, now: number) {
  return rankedRacePlayers(race).map((p, index) => {
    const elapsedMs = Math.max(0, (p.finishedAt ?? now) - race.startsAt);
    return {
      playerIdentityId: p.playerIdentityId,
      displayName: p.displayName,
      kind: p.kind,
      character: p.character,
      progress: p.progress,
      targetLength: p.text.length,
      bonusesReceived: p.bonusesReceived,
      boxCheckpoints: p.boxCheckpoints ?? [],
      fogUntil: p.fogUntil,
      shield: p.shield,
      status: p.status,
      errors: p.errors,
      rank: index + 1,
      elapsedMs,
      ...raceMetrics(p, elapsedMs),
    };
  });
}
