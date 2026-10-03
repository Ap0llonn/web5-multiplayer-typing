import EmbeddedPostgres from "embedded-postgres";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const dir = new URL("../.data/", import.meta.url);
await mkdir(dir, { recursive: true });
if (process.argv[2] === "down") {
  const pid = Number(await readFile(new URL("test-db.pid", dir), "utf8"));
  process.kill(pid, "SIGTERM");
  await unlink(new URL("test-db.pid", dir));
  process.exit(0);
}
const pg = new EmbeddedPostgres({
  databaseDir: new URL("postgres/", dir).pathname,
  user: "typing",
  password: "local-test-only",
  port: 55432,
  persistent: false,
  postgresFlags: ["-h", "127.0.0.1", "-c", "unix_socket_directories="],
  onLog: () => {},
  onError: console.error,
});
await pg.initialise();
await pg.start();
await pg.createDatabase("typing_test");
await writeFile(new URL("test-db.pid", dir), String(process.pid));
await writeFile(
  new URL(".env.test", new URL("../", import.meta.url)),
  `DATABASE_URL=postgresql://typing:local-test-only@127.0.0.1:55432/typing_test\nBETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}\nBETTER_AUTH_URL=http://localhost:3000\n`,
);
console.log("Disposable PostgreSQL ready on loopback port 55432");
let stopped = false;
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, async () => {
    if (stopped) return;
    stopped = true;
    await pg.stop();
    process.exit(0);
  });
setInterval(() => {}, 60000);
