import { afterAll, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { prisma } from "@/shared/infrastructure/db/prisma";

function runSeed(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  return new Promise<{ code: number | null; output: string }>(
    (resolve, reject) => {
      const child = spawn("pnpm", ["db:seed:s1"], {
        env: { ...process.env, ...overrides },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.once("error", reject);
      child.once("exit", (code) => resolve({ code, output }));
    },
  );
}

afterAll(() => prisma.$disconnect());
it("refuses an existing fixture ID collision and rolls back all seed writes", async () => {
  const existing = await prisma.user.create({
    data: {
      id: "seed-s1-guest",
      name: "Existing unrelated user",
      email: "unrelated@example.test",
    },
  });
  const result = await runSeed();
  expect(result.code).toBe(1);
  expect(result.output).toContain("S1 seed failed: transaction rolled back.");
  expect(await prisma.user.findUnique({ where: { id: existing.id } })).toEqual(
    existing,
  );
  expect(
    await prisma.user.findUnique({ where: { id: "seed-s1-host" } }),
  ).toBeNull();
  expect(
    await prisma.playerIdentity.count({
      where: { id: { startsWith: "seed-s1-" } },
    }),
  ).toBe(0);
  expect(
    await prisma.lobby.findUnique({ where: { id: "seed-s1-room" } }),
  ).toBeNull();
  await prisma.user.delete({ where: { id: existing.id } });
});

it("seeds two credential-free users and one inactive sample room concurrently and repeatedly without altering data", async () => {
  const unrelatedId = `unrelated-${crypto.randomUUID()}`;
  await prisma.user.create({
    data: {
      id: unrelatedId,
      name: "Keep me",
      email: `${unrelatedId}@example.test`,
    },
  });
  const credentialsBefore = [
    await prisma.account.count(),
    await prisma.session.count(),
  ];
  const firstRuns = await Promise.all([runSeed(), runSeed()]);
  for (const first of firstRuns)
    expect(first, first.output).toMatchObject({ code: 0 });
  const before = await prisma.lobby.findUnique({
    where: { id: "seed-s1-room" },
    include: { members: true },
  });
  expect(before).toMatchObject({ state: "CLOSED", code: "SEED23" });
  expect(before?.members).toHaveLength(2);
  expect(
    before?.members.every((member) => member.activePlayerIdentityId === null),
  ).toBe(true);
  expect(
    await prisma.user.count({
      where: { id: { in: ["seed-s1-host", "seed-s1-guest"] } },
    }),
  ).toBe(2);
  expect(
    await prisma.playerIdentity.count({
      where: { authUserId: { in: ["seed-s1-host", "seed-s1-guest"] } },
    }),
  ).toBe(2);
  const second = await runSeed();
  expect(second, second.output).toMatchObject({ code: 0 });
  expect(
    await prisma.lobby.findUnique({
      where: { id: "seed-s1-room" },
      include: { members: true },
    }),
  ).toEqual(before);
  expect([await prisma.account.count(), await prisma.session.count()]).toEqual(
    credentialsBefore,
  );
  expect(
    await prisma.user.findUnique({ where: { id: unrelatedId } }),
  ).toMatchObject({ name: "Keep me" });
});

it("refuses production, remote and unnamed targets before connecting without leaking the URL", async () => {
  const targets: Partial<NodeJS.ProcessEnv>[] = [
    { NODE_ENV: "production", DATABASE_URL: process.env.DATABASE_URL },
    {
      DATABASE_URL:
        "postgresql://private-user:private-password@db.example.test:5432/typing_dev",
    },
    {
      DATABASE_URL:
        "postgresql://private-user:private-password@localhost:5432/typing",
    },
    {
      DATABASE_URL:
        "postgresql://private-user:private-password@localhost:5432/postgres",
    },
    {
      DATABASE_URL:
        "postgresql://private-user:private-password@localhost:5432/typing_test?host=remote.example",
    },
    { DATABASE_URL: "invalid" },
  ];
  for (const target of targets) {
    const result = await runSeed(target);
    expect(result.code).toBe(1);
    expect(result.output).toContain(
      "S1 seed refused: use a local *_dev or *_test database outside production.",
    );
    expect(result.output).not.toContain("private-password");
    expect(result.output).not.toContain("private-user");
  }
}, 30000);
