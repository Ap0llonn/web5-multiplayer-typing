import { z } from "zod";
export const raceArchiveIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9-]+$/);
export const raceArchiveSchema = z.object({
  players: z
    .array(
      z.object({
        playerIdentityId: z.string(),
        displayName: z.string(),
        kind: z.enum(["account", "guest", "bot"]),
        character: z.enum(["cobalt", "coral", "mint", "butter", "profile"]),
        rank: z.number().int().positive(),
        status: z.enum(["FINISHED", "TIMEOUT", "ABANDONED", "TYPING"]),
        wpm: z.number(),
        grossWpm: z.number(),
        accuracy: z.number(),
        errors: z.number(),
        elapsedMs: z.number(),
        bonusesReceived: z.number(),
        samples: z.array(z.object({ elapsedMs: z.number(), wpm: z.number() })),
      }),
    )
    .max(30),
});
export type RaceArchive = z.infer<typeof raceArchiveSchema>;
