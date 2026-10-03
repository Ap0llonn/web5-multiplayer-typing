import { z } from "zod";
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
  })
  .strict();
export const joinLobbySchema = z
  .object({ code: roomCodeSchema, role: z.enum(["PARTICIPANT", "SPECTATOR"]) })
  .strict();
export const validateCreateInput = (input: unknown) =>
  createLobbySchema.safeParse(input);
