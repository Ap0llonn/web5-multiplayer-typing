import { z } from "zod";
const charactersSchema = z
  .string()
  .max(40)
  .regex(/^[^\s\u0000-\u001f\u007f\ud800-\udfff]*$/);
export const raceSettingsSchema = z
  .object({
    language: z.enum(["fr", "en"]),
    wordCount: z.number().int().min(10).max(100),
    durationSeconds: z.number().int().min(30).max(600).nullable(),
    correction: z.enum(["required", "free"]),
    bonuses: z.boolean().default(true),
    mode: z.enum(["coherent", "random"]).default("coherent"),
    complexity: z.enum(["easy", "medium", "hard"]).default("medium"),
    punctuation: z.boolean().default(true),
    numbers: z.boolean().default(true),
    uppercase: z.boolean().default(true),
    accents: z.boolean().default(true),
    includeCharacters: charactersSchema.default(""),
    excludeCharacters: charactersSchema.default(""),
    bots: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9-]{1,40}$/),
            level: z.union([
              z.literal(1),
              z.literal(2),
              z.literal(3),
              z.literal(4),
              z.literal(5),
            ]),
          })
          .strict(),
      )
      .max(29)
      .default([]),
    capacity: z.number().int().min(2).max(30).optional(),
    visibility: z.enum(["PUBLIC", "CODE"]).optional(),
  })
  .strict()
  .superRefine((s, ctx) => {
    const invalid = (path: string) =>
      ctx.addIssue({
        code: "custom",
        path: [path],
        message: "Invalid combination",
      });
    if (new Set(s.bots.map((b) => b.id)).size !== s.bots.length)
      invalid("bots");
    if (s.mode === "coherent" && (s.includeCharacters || s.excludeCharacters))
      invalid("includeCharacters");
    for (const c of s.includeCharacters) {
      if (
        s.excludeCharacters.includes(c) ||
        (!s.numbers && /[0-9]/.test(c)) ||
        (!s.uppercase && /[A-ZÀ-ÖØ-Þ]/.test(c)) ||
        (!s.accents && /[à-öø-ÿÀ-ÖØ-ÞœŒ]/.test(c)) ||
        (!s.punctuation && /[^\p{L}\p{N}]/u.test(c))
      )
        invalid("includeCharacters");
    }
  });
export const raceEditSchema = z
  .object({
    raceId: z.string().min(1).max(80),
    sequence: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    textRevision: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER)
      .default(0),
    edits: z
      .array(
        z.union([
          z
            .string()
            .length(1)
            .regex(/^[^\u0000-\u001f\u007f]$/),
          z.null(),
        ]),
      )
      .min(1)
      .max(32),
  })
  .strict();
export const emptyRaceCommandSchema = z.object({}).strict();
export const raceUseItemSchema = z
  .object({
    raceId: z.string().min(1).max(80),
    itemId: z.string().min(1).max(160),
  })
  .strict();
const checkpointSchema = z.union([z.literal(25), z.literal(50), z.literal(75)]);
const itemTypeSchema = z.enum([
  "shortcut",
  "detour",
  "fog",
  "shield",
  "clear",
  "nudge",
  "catchup",
]);
const itemSchema = z.object({
  id: z.string(),
  type: itemTypeSchema,
  checkpoint: checkpointSchema,
  strength: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  receivedAt: z.number(),
  usedAt: z.number().nullable(),
});
// Validates persisted aggregate data before it enters the domain.
export const raceStateSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    botAlgorithmVersion: z.literal(1).default(1),
    bonusRulesVersion: z.union([z.literal(1), z.literal(2)]).default(1),
    startsAt: z.number(),
    endedAt: z.number().nullable(),
    // Existing races must retain their original rules when deployed mid-race.
    settings: raceSettingsSchema.safeExtend({
      bonuses: z.boolean().default(false),
    }),
    checkpoints: z.array(checkpointSchema).default([]),
    events: z
      .array(
        z.object({
          id: z.string(),
          type: itemTypeSchema,
          actorId: z.string(),
          targetId: z.string(),
          outcome: z.enum(["received", "applied", "blocked"]),
          at: z.number(),
        }),
      )
      .default([]),
    players: z.array(
      z.object({
        playerIdentityId: z.string(),
        kind: z.enum(["account", "guest", "bot"]),
        bot: z
          .object({
            level: z.union([
              z.literal(1),
              z.literal(2),
              z.literal(3),
              z.literal(4),
              z.literal(5),
            ]),
            nextAt: z.number(),
            stroke: z.number().int().nonnegative(),
          })
          .optional(),
        displayName: z.string(),
        character: z.enum(["cobalt", "coral", "mint", "butter"]),
        draft: z.string(),
        sequence: z.number(),
        progress: z.number(),
        correct: z.number(),
        total: z.number(),
        errors: z.number(),
        status: z.enum(["TYPING", "FINISHED", "TIMEOUT", "ABANDONED"]),
        finishedAt: z.number().nullable(),
        lastEditAt: z.number(),
        budget: z.number(),
        samples: z.array(z.object({ elapsedMs: z.number(), wpm: z.number() })),
        text: z.string().optional(),
        textRevision: z.number().int().nonnegative().default(0),
        items: z.array(itemSchema).max(3).default([]),
        boxCheckpoints: z.array(checkpointSchema).max(3).default([]),
        bonusesReceived: z.number().int().min(0).max(3).default(0),
        fogUntil: z.number().nullable().default(null),
        shield: z.boolean().default(false),
      }),
    ),
  })
  .transform((race) => ({
    ...race,
    players: race.players.map((player) => ({
      ...player,
      text: player.text ?? race.text,
    })),
  }));
