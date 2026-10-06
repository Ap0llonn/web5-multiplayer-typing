import { z } from "zod";
export const characterSchema = z.enum(["cobalt", "coral", "mint", "butter"]);
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
export const createLobbySchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    capacity: z.number().int().min(2).max(30),
    role: z.enum(["PARTICIPANT", "SPECTATOR"]),
    character: characterSchema.optional(),
  })
  .strict();
export const heartbeatLobbySchema = z.object({}).strict();
export const joinLobbySchema = z
  .object({
    code: roomCodeSchema,
    role: z.enum(["PARTICIPANT", "SPECTATOR"]),
    character: characterSchema.optional(),
  })
  .strict();
export const validateCreateInput = (input: unknown) =>
  createLobbySchema.safeParse(input);
