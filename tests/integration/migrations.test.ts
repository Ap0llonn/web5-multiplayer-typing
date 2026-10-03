import { it, expect } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
it("has exactly the versioned migrations and rejects impossible capacity at the DB boundary", async () => {
  const rows = await prisma.$queryRaw<
    Array<{ migration_name: string; finished_at: Date | null }>
  >`SELECT migration_name,finished_at FROM _prisma_migrations ORDER BY migration_name`;
  expect(rows.map((r) => r.migration_name)).toEqual([
    "20261003120000_identity",
    "20261003124000_lobby",
  ]);
  expect(rows.every((r) => r.finished_at)).toBe(true);
  const constraints = await prisma.$queryRaw<
    Array<{ conname: string }>
  >`SELECT conname FROM pg_constraint WHERE conname IN ('Lobby_capacity_check','Lobby_code_check','LobbyMember_active_identity_check')`;
  expect(constraints).toHaveLength(3);
});
