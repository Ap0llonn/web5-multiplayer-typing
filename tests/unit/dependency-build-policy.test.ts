import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("approves the PostgreSQL test package used by Linux ARM64 Docker builds", () => {
  const policy = readFileSync(
    new URL("../../pnpm-workspace.yaml", import.meta.url),
    "utf8",
  );
  expect(policy).toMatch(/^ {2}'@embedded-postgres\/linux-arm64': true$/m);
  expect(policy).not.toMatch(/^dangerouslyAllowAllBuilds: true$/m);
});
