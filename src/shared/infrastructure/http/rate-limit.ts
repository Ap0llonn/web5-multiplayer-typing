import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
export async function allowRequest(
  scope: string,
  headers: Headers,
  max: number,
) {
  // Production reverse proxy MUST overwrite X-Forwarded-For, never append untrusted input.
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `app:${scope}:${createHash("sha256").update(ip).digest("hex")}`;
  const now = BigInt(Date.now());
  const cutoff = now - 60000n;
  const rows = await prisma.$queryRaw<
    Array<{ count: number }>
  >`INSERT INTO "rateLimit" (id,key,count,"lastRequest") VALUES (${randomUUID()},${key},1,${now}) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "rateLimit"."lastRequest" < ${cutoff} THEN 1 ELSE "rateLimit".count+1 END, "lastRequest"=CASE WHEN "rateLimit"."lastRequest" < ${cutoff} THEN ${now} ELSE "rateLimit"."lastRequest" END RETURNING count`;
  return rows[0].count <= max;
}
