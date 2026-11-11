import { z } from "zod";
export const invitationTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const invitationLinksSchema = z
  .array(
    z.object({
      digest: invitationTokenSchema,
      expiresAt: z.number().int().nonnegative(),
      claimedBy: z.string().nullable(),
      joinedAt: z.number().nullable(),
    }),
  )
  .max(50);
export type InvitationLink = z.infer<typeof invitationLinksSchema>[number];
export type CreatedInvitation = { token: string; expiresAt: number };
export interface InvitationTokens {
  create(): string;
  digest(token: string): string;
}
