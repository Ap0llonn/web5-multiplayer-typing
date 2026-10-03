import EmbeddedPostgres from "embedded-postgres";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
const databaseDir = await mkdtemp(join(tmpdir(), "typing-test-"));
const pg = new EmbeddedPostgres({
  databaseDir: join(databaseDir, "db"),
  user: "typing",
  password: "local-test-only",
  port: 55432,
  persistent: false,
  postgresFlags: ["-h", "127.0.0.1", "-c", "unix_socket_directories="],
  onLog: () => {},
  onError: () => {},
});
const env: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL:
    "postgresql://typing:local-test-only@127.0.0.1:55432/typing_test",
  BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
  BETTER_AUTH_URL: "http://localhost:3000",
  NODE_ENV: "test",
};
const run = (cmd: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", env });
    child.once("error", reject);
    child.once("exit", (c) =>
      c === 0 ? resolve() : reject(Error(`${cmd} exited ${c}`)),
    );
  });
try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("typing_test");
  await run("pnpm", ["exec", "prisma", "migrate", "deploy"]);
  await run("pnpm", ["exec", "prisma", "migrate", "deploy"]);
  const args = process.argv.slice(2);
  await run(
    "pnpm",
    args.length ? args : ["exec", "vitest", "run", "tests/integration"],
  );
} finally {
  await pg.stop();
  await rm(databaseDir, { recursive: true, force: true });
}
