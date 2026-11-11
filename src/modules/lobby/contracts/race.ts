import type { KeyStatistic } from "./key-statistics";
import type { LobbyCharacter } from "./lobby";

export type RaceSettings = {
  language: "fr" | "en";
  wordCount: number;
  durationSeconds: number | null;
  correction: "required" | "free";
  bonuses?: boolean;
  mode?: "coherent" | "random";
  complexity?: "easy" | "medium" | "hard";
  punctuation?: boolean;
  numbers?: boolean;
  uppercase?: boolean;
  accents?: boolean;
  includeCharacters?: string;
  excludeCharacters?: string;
  bots?: { id: string; level: 1 | 2 | 3 | 4 | 5 }[];
  capacity?: number;
  visibility?: "PUBLIC" | "CODE";
};
export type RaceEditInput = {
  raceId: string;
  sequence: number;
  edits: (string | null)[];
  textRevision?: number;
};
export type RaceItemType =
  | "shortcut"
  | "detour"
  | "fog"
  | "shield"
  | "clear"
  | "nudge"
  | "catchup"
  | "shockwave";
export type RaceCheckpoint = 25 | 50 | 75;
export type RaceItem = {
  id: string;
  type: RaceItemType;
  checkpoint: RaceCheckpoint;
  strength?: 1 | 2 | 3;
  receivedAt: number;
  usedAt: number | null;
};
export type RaceUseItemInput = { raceId: string; itemId: string };
export type RaceBonusEvent = {
  id: string;
  type: RaceItemType;
  actorId: string;
  targetId: string;
  outcome: "received" | "applied" | "blocked";
  at: number;
};
export type RaceStatus = "TYPING" | "FINISHED" | "TIMEOUT" | "ABANDONED";
export type RacePlayer = {
  playerIdentityId: string;
  kind: "account" | "guest" | "bot";
  bot?: { level: 1 | 2 | 3 | 4 | 5; nextAt: number; stroke: number };
  displayName: string;
  character: LobbyCharacter;
  draft: string;
  sequence: number;
  progress: number;
  correct: number;
  total: number;
  errors: number;
  status: RaceStatus;
  finishedAt: number | null;
  lastEditAt: number;
  budget: number;
  keyStatistics?: KeyStatistic[];
  samples: { elapsedMs: number; wpm: number }[];
  text: string;
  textRevision: number;
  items: RaceItem[];
  boxCheckpoints?: RaceCheckpoint[];
  bonusesReceived: number;
  fogUntil: number | null;
  shield: boolean;
};
export type RaceState = {
  botAlgorithmVersion?: 1;
  bonusRulesVersion?: 1 | 2;
  id: string;
  text: string;
  startsAt: number;
  endedAt: number | null;
  settings: RaceSettings;
  players: RacePlayer[];
  checkpoints: RaceCheckpoint[];
  events: RaceBonusEvent[];
};
export type RaceMetrics = { wpm: number; grossWpm: number; accuracy: number };
export type RaceStanding = Pick<
  RacePlayer,
  | "playerIdentityId"
  | "kind"
  | "displayName"
  | "character"
  | "progress"
  | "status"
  | "errors"
  | "boxCheckpoints"
  | "bonusesReceived"
  | "fogUntil"
  | "shield"
> &
  RaceMetrics & { rank: number; elapsedMs: number; targetLength: number };
export type RaceSnapshot = {
  bonusRulesVersion?: 1 | 2;
  id: string;
  text: string;
  startsAt: number;
  endedAt: number | null;
  serverNow: number;
  settings: RaceSettings;
  players: RaceStanding[];
  checkpoints: RaceCheckpoint[];
  events: RaceBonusEvent[];
  self: {
    draft: string;
    sequence: number;
    text: string;
    textRevision: number;
    items: RaceItem[];
  } | null;
};
