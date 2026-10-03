import { describe, expect, it } from "vitest";
import { assertLocalComposeConfig } from "../../scripts/compose-config";

const config = () => ({
  services: {
    postgres: {
      image: "postgres:18.4",
      ports: [{ host_ip: "127.0.0.1", target: 5432 }],
      volumes: [
        {
          type: "volume",
          source: "postgres-data",
          target: "/var/lib/postgresql",
        },
      ],
      healthcheck: { test: ["CMD-SHELL", "pg_isready"] },
    },
    redis: {
      image: "redis:8.2.10-alpine",
      ports: [{ host_ip: "127.0.0.1", target: 6379 }],
      volumes: [{ type: "volume", source: "redis-data", target: "/data" }],
      healthcheck: { test: ["CMD", "redis-cli", "ping"] },
    },
    s3: {
      image: "chrislusf/seaweedfs:4.48",
      ports: [{ host_ip: "127.0.0.1", target: 8333 }],
      volumes: [{ type: "volume", source: "s3-data", target: "/data" }],
      healthcheck: { test: ["CMD", "curl", "http://localhost:8333/status"] },
    },
  },
  volumes: { "postgres-data": {}, "redis-data": {}, "s3-data": {} },
});

describe("local Compose safety contract", () => {
  it("accepts versioned services with loopback ports, healthchecks and named volumes", () => {
    expect(() => assertLocalComposeConfig(config())).not.toThrow();
  });

  it("rejects accidentally public ports", () => {
    const value = config();
    value.services.redis.ports[0].host_ip = "0.0.0.0";
    expect(() => assertLocalComposeConfig(value)).toThrow();
  });

  it("rejects the obsolete PostgreSQL 17 volume path on PostgreSQL 18", () => {
    const value = config();
    value.services.postgres.volumes[0].target = "/var/lib/postgresql/data";
    expect(() => assertLocalComposeConfig(value)).toThrow();
  });

  it("rejects extra admin ports, anonymous volumes, missing healthchecks and mutable latest tags", () => {
    const extraPort = config();
    extraPort.services.s3.ports.push({ host_ip: "127.0.0.1", target: 8888 });
    const anonymousVolume = config();
    anonymousVolume.services.s3.volumes[0].source = "";
    const missingHealthcheck = config();
    missingHealthcheck.services.redis.healthcheck.test = [];
    const latestImage = config();
    latestImage.services.s3.image = "chrislusf/seaweedfs:latest";
    for (const value of [
      extraPort,
      anonymousVolume,
      missingHealthcheck,
      latestImage,
    ]) {
      expect(() => assertLocalComposeConfig(value)).toThrow();
    }
  });
});
