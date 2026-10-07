import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import {
  assertLocalComposeConfig,
  assertProductionComposeConfig,
} from "./compose-config";

// Every run owns a unique disposable project. Never read .env or reuse dev data.
const project = `typing-compose-test-${randomUUID()}`;
const env = {
  ...process.env,
  ...parse(readFileSync(".env.example")),
  POSTGRES_PORT: "0",
  REDIS_PORT: "0",
  S3_PORT: "0",
  APP_PORT: "0",
};
const base = [
  "compose",
  "--file",
  "compose.yaml",
  "--env-file",
  ".env.example",
  "--project-name",
  project,
];

function compose(args: string[], input?: Buffer): Buffer {
  const result = spawnSync("docker", [...base, ...args], {
    env,
    input,
    timeout: 240_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error)
    throw new Error(`Docker Compose is required: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(
      `Compose ${args[0]} failed (${result.status}): ${result.stderr.toString()}`,
    );
  }
  return result.stdout;
}

function exec(service: string, script: string, input?: Buffer) {
  return compose(["exec", "-T", service, "sh", "-ec", script], input);
}

// Curl is included in the maintainer's SeaweedFS image. Signature V4 exercises
// the real S3 endpoint without adding an unused application SDK dependency.
const signedCurl =
  'curl --fail --silent --show-error --max-time 15 --aws-sigv4 "aws:amz:$AWS_DEFAULT_REGION:s3" --user "$AWS_ACCESS_KEY_ID:$AWS_SECRET_ACCESS_KEY"';
const objectUrl = '"http://127.0.0.1:8333/$S3_BUCKET/compose-smoke.png"';
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
const sql = (statement: string) =>
  exec(
    "postgres",
    `psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc '${statement}'`,
  )
    .toString()
    .trim();

assertLocalComposeConfig(
  JSON.parse(compose(["config", "--format", "json"]).toString()),
);
// Parse production separately with public placeholders; never inspect real secrets.
const production = spawnSync(
  "docker",
  [
    "compose",
    "--file",
    "compose.production.yaml",
    "--env-file",
    ".env.production.example",
    "config",
    "--format",
    "json",
  ],
  {
    env: { ...process.env, ...parse(readFileSync(".env.production.example")) },
    timeout: 30_000,
  },
);
assert.ifError(production.error);
assert.equal(
  production.status,
  0,
  "Production Compose must parse successfully",
);
assertProductionComposeConfig(JSON.parse(production.stdout.toString()));
if (process.argv.includes("--config-only")) {
  console.log(
    "Compose configuration: pinned images, loopback ports, healthchecks and volumes verified.",
  );
  console.log("Production Compose: shared external Dokploy network verified.");
} else {
  try {
    compose(["up", "--detach", "--wait", "--wait-timeout", "120"]);
    sql(
      "CREATE TABLE compose_probe (value text NOT NULL); INSERT INTO compose_probe VALUES ($$persistent$$)",
    );
    assert.equal(
      exec("redis", "redis-cli --raw SET compose-probe persistent")
        .toString()
        .trim(),
      "OK",
    );
    exec(
      "s3",
      `${signedCurl} --retry 20 --retry-all-errors --retry-delay 1 --head "http://127.0.0.1:8333/$S3_BUCKET"`,
    );
    exec(
      "s3",
      `${signedCurl} -X PUT -H 'Content-Type: image/png' --data-binary @- ${objectUrl}`,
      png,
    );

    const checkData = () => {
      assert.equal(sql("SELECT value FROM compose_probe"), "persistent");
      assert.equal(
        exec("redis", "redis-cli --raw GET compose-probe").toString().trim(),
        "persistent",
      );
      assert.deepEqual(exec("s3", `${signedCurl} ${objectUrl}`), png);
      const anonymousStatus = exec(
        "s3",
        `curl --silent --max-time 15 -o /dev/null -w '%{http_code}' ${objectUrl}`,
      ).toString();
      assert.equal(
        anonymousStatus,
        "403",
        "Images must not be anonymously readable",
      );
    };
    checkData();
    // Proves named-volume persistence across container removal, not just restart.
    compose(["down"]);
    compose(["up", "--detach", "--wait", "--wait-timeout", "120"]);
    checkData();
    console.log(
      "Compose smoke passed: PostgreSQL, Redis, authenticated S3 PNG round-trip and persistence after down/up.",
    );
  } catch (error) {
    // This project only ever receives committed, public local-example values.
    // Capture diagnostics before teardown; retain the original failure if logs fail.
    try {
      console.error(compose(["logs", "--no-color", "--tail", "80"]).toString());
    } catch {
      console.error("Compose logs unavailable.");
    }
    throw error;
  } finally {
    // Only this randomly named test project's resources, never typing-local.
    compose(["down", "--volumes"]);
  }
}
