import { z } from "zod";

export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
export const profilePhotoQuerySchema = z.strictObject({
  v: z.coerce
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER)
    .optional(),
});
export const profileNameSchema = z.strictObject({
  displayName: z
    .string()
    .refine((value) => !/[\u0000-\u001f\u007f]/u.test(value))
    .transform((value) => value.trim())
    .pipe(z.string().min(3).max(20)),
});
export type Profile = {
  displayName: string;
  username: string | null;
  joinedAt: number;
  photoVersion: number | null;
};
export type ProfileUpdateInput = {
  displayName: string;
  photo?: Uint8Array;
};
