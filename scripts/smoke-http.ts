import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const server = spawn("pnpm", ["start"], {
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NODE_ENV: "production" },
});
let logs = "";
server.stdout?.on("data", (c) => (logs += String(c)));
server.stderr?.on("data", (c) => (logs += String(c)));
const base = "http://localhost:3000";
async function request(
  path: string,
  body?: object,
  cookie?: string,
  origin = base,
) {
  return fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      origin,
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const cookieOf = (r: Response) =>
  r.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
try {
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(base);
      break;
    } catch {
      if (i === 99) throw Error("Server startup failed: " + logs);
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  const redirect = await fetch(base, {
    redirect: "manual",
    headers: { "accept-language": "en-US" },
  });
  assert.match(redirect.headers.get("location") ?? "", /\/en/);
  assert.match(
    await (await fetch(base + "/fr")).text(),
    /Jeu de frappe multijoueur/,
  );
  assert.match(await (await fetch(base + "/en")).text(), /Multiplayer typing/);
  const signup = await request("/api/auth/sign-up/email", {
    name: "SmokeHost",
    username: "smokehost",
    email: "smoke@example.com",
    password: "test-password-123",
  });
  assert.equal(signup.status, 200);
  const hostCookie = cookieOf(signup);
  assert.ok(hostCookie.includes("session_token"));
  assert.match(signup.headers.get("set-cookie") ?? "", /HttpOnly/);
  const guest = await request("/api/auth/sign-in/anonymous", {
    name: "Smoke Guest",
  });
  assert.equal(guest.status, 200);
  const guestCookie = cookieOf(guest);
  const forbidden = await request(
    "/api/lobbies",
    { name: "No", capacity: 2, role: "PARTICIPANT" },
    guestCookie,
  );
  assert.equal(forbidden.status, 403);
  assert.equal(
    (
      await request(
        "/api/lobbies",
        { name: "No", capacity: 2, role: "PARTICIPANT" },
        hostCookie,
        "https://evil.example",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        "/api/lobbies",
        { name: "No", capacity: 2, role: "PARTICIPANT", actor: "spoof" },
        hostCookie,
      )
    ).status,
    400,
  );
  const created = await request(
    "/api/lobbies",
    { name: "Smoke Room", capacity: 2, role: "PARTICIPANT" },
    hostCookie,
  );
  const room = await created.json();
  assert.equal(created.status, 200, JSON.stringify(room));
  assert.match(room.value.code, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
  const ctrl = new AbortController();
  const stream = await fetch(base + `/api/lobbies/${room.value.code}/events`, {
    headers: { cookie: hostCookie },
    signal: ctrl.signal,
  });
  assert.equal(stream.status, 200);
  const reader = stream.body!.getReader();
  assert.match(
    new TextDecoder().decode((await reader.read()).value),
    /SmokeHost/,
  );
  const joined = await request(
    "/api/lobbies/join",
    { code: room.value.code, role: "PARTICIPANT" },
    guestCookie,
  );
  assert.equal(joined.status, 200);
  let observed = false;
  for (let i = 0; i < 6; i++) {
    const msg = new TextDecoder().decode((await reader.read()).value);
    if (msg.includes("Smoke Guest")) {
      observed = true;
      break;
    }
  }
  assert.ok(observed, "SSE must show a real second session");
  ctrl.abort();
  const repeat = await request(
    "/api/lobbies/join",
    { code: room.value.code, role: "PARTICIPANT" },
    guestCookie,
  );
  assert.equal((await repeat.json()).value.members.length, 2);
  const current = await request("/api/lobbies/me", undefined, guestCookie);
  assert.equal((await current.json()).value.code, room.value.code);
  await request("/api/auth/sign-out", {}, guestCookie);
  assert.equal(
    (await request("/api/lobbies/me", undefined, guestCookie)).status,
    401,
  );
  console.log(
    "Production HTTP smoke passed: browser-locale routing, FR/EN HTML, signed sessions, guest restriction, CSRF, schema validation, create/join, live SSE, duplicate join, reconnect identity and revoked-session refusal",
  );
} finally {
  if (server.pid) process.kill(-server.pid, "SIGTERM");
}
