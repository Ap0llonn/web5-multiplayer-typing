import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// Removing the migration step or replacing && with ; must break these tests.
// Execute the real image startup command, replacing only the external pnpm CLI.
describe.skipIf(process.platform === "win32")(
  "production image startup",
  () => {
    function runStartup(migrationExitCode: number) {
      const directory = mkdtempSync(join(tmpdir(), "typing-startup-test-"));
      try {
        const log = join(directory, "commands.log");
        const stub = join(directory, "pnpm-stub.ts");
        writeFileSync(
          stub,
          `#!${process.execPath}
import { appendFileSync } from "node:fs";
const log = process.env.STARTUP_TEST_LOG;
if (!log) throw new Error("Missing test log");
const args = process.argv.slice(2);
appendFileSync(log, args.join(" ") + "\\n");
if (args.join(" ") === "exec prisma migrate deploy") {
  process.exit(Number(process.env.STARTUP_TEST_MIGRATION_EXIT));
}
process.exit(args.join(" ") === "start" ? 0 : 99);
`,
          { mode: 0o755 },
        );
        symlinkSync(stub, join(directory, "pnpm"));
        const dockerfile = readFileSync(
          new URL("../../Dockerfile", import.meta.url),
          "utf8",
        );
        const productionStage = dockerfile.split("FROM base AS production")[1];
        if (!productionStage) throw new Error("Missing production image stage");
        const match = productionStage.match(/^CMD (.+)$/m);
        if (!match) throw new Error("Missing production startup command");
        const command = z.array(z.string()).min(1).parse(JSON.parse(match[1]));
        const result = spawnSync(command[0], command.slice(1), {
          env: {
            ...process.env,
            PATH: `${directory}${delimiter}${process.env.PATH ?? ""}`,
            STARTUP_TEST_LOG: log,
            STARTUP_TEST_MIGRATION_EXIT: String(migrationExitCode),
          },
          timeout: 10_000,
          encoding: "utf8",
        });
        expect(result.error).toBeUndefined();
        return {
          status: result.status,
          commands: readFileSync(log, "utf8").trim().split("\n"),
        };
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    }

    it("applies pending migrations before starting Next.js", () => {
      expect(runStartup(0)).toEqual({
        status: 0,
        commands: ["exec prisma migrate deploy", "start"],
      });
    });

    it("does not start the server when migration execution fails", () => {
      expect(runStartup(17)).toEqual({
        status: 17,
        commands: ["exec prisma migrate deploy"],
      });
    });
  },
);
