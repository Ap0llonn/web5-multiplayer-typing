import { createHash, randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";
import { handleLobbyCommand } from "@/composition/lobby/http";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { signup } from "../support/auth";

const base = "http://localhost:3000";
const ips = ["198.51.100.190", "198.51.100.191", "198.51.100.192"];
const keyFor = (ip: string) =>
  `app:join:${createHash("sha256").update(ip).digest("hex")}`;
const denied = {
  ok: false,
  error: { code: "RATE_LIMITED", messageKey: "errors.RATE_LIMITED" },
};
let cookies: string[];

beforeAll(async () => {
  const auth = createAuthentication();
  cookies = [];
  for (let n = 0; n < 2; n++) {
    const username = `limit${randomUUID().replaceAll("-", "").slice(0, 10)}`;
    cookies.push((await signup(auth, username)).cookie);
  }
  expect(
    await prisma.lobby.findUnique({ where: { code: "ZZZZZZ" } }),
  ).toBeNull();
});
beforeEach(async () => {
  await prisma.rateLimit.deleteMany({
    where: { key: { in: ips.map(keyFor) } },
  });
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

function join(cookie: string, ip: string) {
  return handleLobbyCommand(
    new Request(`${base}/api/lobbies/join`, {
      method: "POST",
      headers: {
        cookie,
        origin: base,
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ code: "ZZZZZZ", role: "PARTICIPANT" }),
    }),
    "join",
  );
}

it("admits exactly ten join attempts per IP across sessions, then returns the translated HTTP 429 contract", async () => {
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now);
  for (let n = 0; n < 10; n++) {
    const response = await join(cookies[n % 2], ips[0]);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", messageKey: "errors.NOT_FOUND" },
    });
  }
  const response = await join(cookies[1], ips[0]);
  expect(response.status).toBe(429);
  expect(await response.json()).toEqual(denied);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect((await join(cookies[1], ips[1])).status).toBe(404);
  expect(
    await prisma.rateLimit.findUniqueOrThrow({
      where: { key: keyFor(ips[0]) },
    }),
  ).toMatchObject({
    count: 11,
    lastRequest: BigInt(now),
  });
});

it("keeps the first-attempt window through 60000ms and resets at 60001ms without extending it on denied requests", async () => {
  const start = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(start);
  for (let n = 0; n < 10; n++) {
    clock.mockReturnValue(start + n * 1000);
    expect((await join(cookies[0], ips[0])).status).toBe(404);
  }
  for (const elapsed of [59999, 60000]) {
    clock.mockReturnValue(start + elapsed);
    const response = await join(cookies[0], ips[0]);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual(denied);
  }
  expect(
    await prisma.rateLimit.findUniqueOrThrow({
      where: { key: keyFor(ips[0]) },
    }),
  ).toMatchObject({
    count: 12,
    lastRequest: BigInt(start),
  });
  clock.mockReturnValue(start + 60001);
  expect((await join(cookies[0], ips[0])).status).toBe(404);
  expect(
    await prisma.rateLimit.findUniqueOrThrow({
      where: { key: keyFor(ips[0]) },
    }),
  ).toMatchObject({
    count: 1,
    lastRequest: BigInt(start + 60001),
  });
});

it("atomically admits only ten of twelve concurrent join attempts sharing an IP", async () => {
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now);
  const responses = await Promise.all(
    Array.from({ length: 12 }, (_, n) => join(cookies[n % 2], ips[2])),
  );
  expect(responses.filter((response) => response.status === 404)).toHaveLength(
    10,
  );
  const refused = responses.filter((response) => response.status === 429);
  expect(refused).toHaveLength(2);
  for (const response of refused) expect(await response.json()).toEqual(denied);
  expect(
    await prisma.rateLimit.findUniqueOrThrow({
      where: { key: keyFor(ips[2]) },
    }),
  ).toMatchObject({
    count: 12,
    lastRequest: BigInt(now),
  });
});
