import { z } from "zod";

export const keyStatisticsSchema = z
  .array(
    z
      .object({
        key: z
          .string()
          .min(1)
          .max(2)
          .refine(
            (key) =>
              [...key].length === 1 && !/[\u0000-\u001f\u007f]/u.test(key),
          ),
        total: z.number().int().nonnegative(),
        errors: z.number().int().nonnegative(),
      })
      .refine((entry) => entry.errors <= entry.total),
  )
  .max(256);
export type KeyStatistic = z.infer<typeof keyStatisticsSchema>[number];
