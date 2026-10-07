import { z } from "zod";

function service(image: string, port: number, volume: string, target: string) {
  return z.object({
    image: z.literal(image),
    ports: z
      .array(
        z.object({ host_ip: z.literal("127.0.0.1"), target: z.literal(port) }),
      )
      .length(1),
    volumes: z
      .array(
        z.object({
          type: z.literal("volume"),
          source: z.literal(volume),
          target: z.literal(target),
        }),
      )
      .length(1),
    healthcheck: z.object({
      test: z.array(z.string()).min(2),
      disable: z.literal(false).optional(),
    }),
  });
}

const schema = z.object({
  services: z.strictObject({
    postgres: service(
      "postgres:18.4",
      5432,
      "postgres-data",
      "/var/lib/postgresql",
    ),
    redis: service("redis:8.2.10-alpine", 6379, "redis-data", "/data"),
    s3: service("chrislusf/seaweedfs:4.48", 8333, "s3-data", "/data"),
    app: z.unknown().optional(),
  }),
  volumes: z.object({
    "postgres-data": z.object({}),
    "redis-data": z.object({}),
    "s3-data": z.object({}),
  }),
});

/** Validates Docker Compose's resolved JSON, not an approximation of its YAML. */
export function assertLocalComposeConfig(value: unknown): void {
  schema.parse(value);
}

/** Internal database DNS requires the existing shared Dokploy network. */
export function assertProductionComposeConfig(value: unknown): void {
  z.object({
    services: z.object({
      app: z.object({
        networks: z.object({ "dokploy-network": z.object({}).nullable() }),
      }),
    }),
    networks: z.object({
      "dokploy-network": z.object({
        name: z.literal("dokploy-network"),
        external: z.literal(true),
      }),
    }),
  }).parse(value);
}
