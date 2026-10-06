import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { handleLobbyCommand } from "@/composition/lobby/http";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { signup, testRequest } from "../support/auth";

const base = "http://localhost:3000";
let accountCookie: string;
let guestCookie: string;

function command(
  ip: string,
  cookie = accountCookie,
  body: string = JSON.stringify({ code: "ZZZZZZ", role: "PARTICIPANT" }),
  operation: "join" | "create" | "current" | "heartbeat" | "leave" = "join",
  code?: string,
  origin = base,
) {
  return handleLobbyCommand(
    new Request(`${base}/api/lobbies`, {
      method: operation === "current" ? "GET" : "POST",
      headers: {
        origin,
        cookie,
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      ...(operation === "current" ? {} : { body }),
    }),
    operation,
    code,
  );
}

async function exhaust(ip: string) {
  for (let n = 0; n < 10; n++) {
    expect((await command(ip)).status).toBe(404);
  }
}

beforeAll(async () => {
  const auth = createAuthentication();
  const username = `limit${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  accountCookie = (await signup(auth, username)).cookie;
  const guest = await testRequest(
    auth,
    "/sign-in/anonymous",
    { name: "Rate limit guest" },
    undefined,
    "198.51.100.240",
  );
  expect(guest.status).toBe(200);
  guestCookie = guest.headers.get("set-cookie")?.split(";")[0] ?? "";
  // Resolve real identities before exercising simultaneous commands.
  for (const cookie of [accountCookie, guestCookie]) {
    expect(
      (await command("198.51.100.240", cookie, "", "current")).status,
    ).toBe(200);
  }
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

it("shares ten code attempts per IP across guest/account sessions and different codes", async () => {
  const ip = "198.51.100.241";
  for (let n = 0; n < 10; n++) {
    const response = await command(
      ip,
      n % 2 === 0 ? accountCookie : guestCookie,
      JSON.stringify({
        code: n % 2 === 0 ? "ZZZZZZ" : "YYYYYY",
        role: "PARTICIPANT",
      }),
    );
    expect(response.status).toBe(404);
  }
  const blocked = await command(ip, guestCookie);
  expect(blocked.status).toBe(429);
  expect(blocked.headers.get("cache-control")).toBe("no-store");
  expect(await blocked.json()).toEqual({
    ok: false,
    error: { code: "RATE_LIMITED", messageKey: "errors.RATE_LIMITED" },
  });
  expect((await command(ip, accountCookie, "", "current")).status).toBe(200);
  expect((await command(ip, guestCookie, "", "current")).status).toBe(200);
});

it("isolates IPs and creation while keeping heartbeat, lookup and leave available after the join limit", async () => {
  const ip = "198.51.100.242";
  await exhaust(ip);
  expect((await command(ip)).status).toBe(429);
  expect((await command("198.51.100.243")).status).toBe(404);

  const created = await command(
    ip,
    accountCookie,
    JSON.stringify({
      name: "Presence despite code limit",
      capacity: 2,
      role: "SPECTATOR",
    }),
    "create",
  );
  expect(created.status).toBe(200);
  const room: { value: { code: string } } = await created.json();
  expect((await command(ip, accountCookie, "", "current")).status).toBe(200);
  for (let n = 0; n < 12; n++) {
    expect(
      (await command(ip, accountCookie, "{}", "heartbeat", room.value.code))
        .status,
    ).toBe(200);
  }
  expect(
    (await command(ip, accountCookie, "{}", "leave", room.value.code)).status,
  ).toBe(200);
  const current = await command(ip, accountCookie, "", "current");
  expect(await current.json()).toEqual({ ok: true, value: null });
});

it("resets at exactly sixty seconds from the first attempt without extending the window on refusals", async () => {
  const started = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(started);
  const ip = "198.51.100.244";
  await exhaust(ip);
  clock.mockReturnValue(started + 59_999);
  expect((await command(ip)).status).toBe(429);
  clock.mockReturnValue(started + 60_000);
  expect((await command(ip)).status).toBe(404);
  for (let n = 1; n < 10; n++) expect((await command(ip)).status).toBe(404);
  expect((await command(ip)).status).toBe(429);
});

it("allows exactly ten simultaneous guesses rather than ten per concurrent connection", async () => {
  const responses = await Promise.all(
    Array.from({ length: 20 }, (_, n) =>
      command("198.51.100.245", n % 2 === 0 ? accountCookie : guestCookie),
    ),
  );
  expect(responses.filter((response) => response.status === 404)).toHaveLength(
    10,
  );
  expect(responses.filter((response) => response.status === 429)).toHaveLength(
    10,
  );
});

it("counts malformed and invalid code attempts before schema parsing", async () => {
  const ip = "198.51.100.246";
  for (let n = 0; n < 10; n++) {
    const response = await command(
      ip,
      guestCookie,
      n % 2 === 0
        ? "{"
        : JSON.stringify({ code: "OOOOOO", role: "PARTICIPANT" }),
    );
    expect(response.status).toBe(400);
  }
  expect((await command(ip, guestCookie)).status).toBe(429);
});

it("rejects unauthenticated or foreign-origin requests without consuming an authenticated IP's allowance", async () => {
  const ip = "198.51.100.247";
  for (let n = 0; n < 11; n++) {
    expect((await command(ip, "")).status).toBe(401);
    expect(
      (
        await command(
          ip,
          accountCookie,
          "{}",
          "join",
          undefined,
          "https://foreign.example",
        )
      ).status,
    ).toBe(403);
  }
  await exhaust(ip);
  expect((await command(ip)).status).toBe(429);
});
