import { config } from "dotenv";
import { spawn } from "node:child_process";
config({ path: ".env.test", quiet: true });
const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (
  !["127.0.0.1", "localhost", "postgres"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
)
  throw Error("Refusing non-disposable test database");
const [command, ...args] = process.argv.slice(2);
if (!command) throw Error("Command required");
const child = spawn(command, args, {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "test" },
});
child.on("exit", (code) => process.exit(code ?? 1));
