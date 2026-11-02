import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
} from "@playwright/test";

test.use({ trace: "off" });

const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const password = "test-password-123";
let nextTestIp = 40;

async function newContext(browser: Browser) {
  nextTestIp += 1;
  return browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${nextTestIp}` },
  });
}

function uniqueName(prefix: string) {
  return `${prefix.slice(0, 8)}${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

async function account(request: APIRequestContext, prefix: string) {
  const username = uniqueName(prefix);
  const response = await request.post("/api/auth/sign-up/email", {
    headers: { origin },
    data: {
      name: username,
      username,
      email: `${username}@example.test`,
      password,
    },
  });
  expect(response.status()).toBe(200);
  return username;
}

async function login(request: APIRequestContext, username: string) {
  const response = await request.post("/api/auth/sign-in/username", {
    headers: { origin },
    data: { username, password },
  });
  expect(response.status()).toBe(200);
}

async function guest(request: APIRequestContext, name: string) {
  const response = await request.post("/api/auth/sign-in/anonymous", {
    headers: { origin },
    data: { name },
  });
  expect(response.status()).toBe(200);
}

async function createRoom(request: APIRequestContext) {
  const response = await request.post("/api/lobbies", {
    headers: { origin },
    data: { name: "API expulsion", capacity: 8, role: "PARTICIPANT" },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  return body.value as { code: string; hostPlayerIdentityId: string };
}

async function join(
  request: APIRequestContext,
  code: string,
  role: "PARTICIPANT" | "SPECTATOR" = "PARTICIPANT",
) {
  const response = await request.post("/api/lobbies/join", {
    headers: { origin },
    data: { code, role },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  return body.value as {
    members: Array<{ playerIdentityId: string; role: string }>;
    bannedPlayerIdentityIds?: string[];
  };
}

test("host expels participants and spectators; the ban blocks join, heartbeat, and SSE for that identity", async ({
  browser,
}) => {
  const host = await newContext(browser);
  const participant = await newContext(browser);
  const spectator = await newContext(browser);
  const observer = await newContext(browser);
  try {
    await account(host.request, "kickhost");
    await guest(participant.request, "Kicked participant");
    await guest(spectator.request, "Kicked spectator");
    await guest(observer.request, "Room observer");
    const { code, hostPlayerIdentityId } = await createRoom(host.request);
    const participantRoom = await join(participant.request, code);
    const spectatorRoom = await join(spectator.request, code, "SPECTATOR");
    await join(observer.request, code);
    const participantId = participantRoom.members.find(
      (member) => member.playerIdentityId !== hostPlayerIdentityId,
    )!.playerIdentityId;
    const spectatorId = spectatorRoom.members.find(
      (member) => member.role === "SPECTATOR",
    )!.playerIdentityId;

    for (const [index, playerIdentityId] of [
      participantId,
      spectatorId,
    ].entries()) {
      const expelled = await host.request.post(`/api/lobbies/${code}/kick`, {
        headers: { origin },
        data: { playerIdentityId },
      });
      expect(expelled.status()).toBe(200);
      const result = await expelled.json();
      expect(result.ok).toBe(true);
      expect(result.value.members).toHaveLength(index === 0 ? 3 : 2);
      expect(result.value).not.toHaveProperty("bannedPlayerIdentityIds");
      expect(JSON.stringify(result.value)).not.toContain(playerIdentityId);
    }

    for (const [context, role] of [
      [participant, "PARTICIPANT"],
      [spectator, "SPECTATOR"],
    ] as const) {
      const rejoin = await context.request.post("/api/lobbies/join", {
        headers: { origin },
        data: { code, role },
      });
      expect(rejoin.status()).toBe(403);
      expect(await rejoin.json()).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });
      const heartbeat = await context.request.post(
        `/api/lobbies/${code}/heartbeat`,
        { headers: { origin }, data: {} },
      );
      expect(heartbeat.status()).toBe(403);
      const events = await context.request.get(`/api/lobbies/${code}/events`, {
        timeout: 5_000,
      });
      expect(events.status()).toBe(403);
      expect(await events.json()).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });
    }
    const current = await observer.request.get("/api/lobbies/me");
    expect(current.status()).toBe(200);
    const snapshot = await current.json();
    expect(snapshot.value.members).toHaveLength(2);
    expect(snapshot.value).not.toHaveProperty("bannedPlayerIdentityIds");
  } finally {
    await Promise.all(
      [host, participant, spectator, observer].map((context) =>
        context.close(),
      ),
    );
  }
});

test("kick is account-host-only, same-origin, strict, and refuses self or absent targets", async ({
  browser,
}) => {
  const host = await newContext(browser);
  const member = await newContext(browser);
  const outsider = await newContext(browser);
  const unrelatedHost = await newContext(browser);
  const noSession = await newContext(browser);
  try {
    await account(host.request, "authhost");
    await account(unrelatedHost.request, "otherhost");
    await guest(member.request, "Member");
    await guest(outsider.request, "Outsider");
    const { code, hostPlayerIdentityId } = await createRoom(host.request);
    const unrelatedRoom = await createRoom(unrelatedHost.request);
    const memberRoom = await join(member.request, code);
    const memberId = memberRoom.members.find(
      (entry) => entry.playerIdentityId !== hostPlayerIdentityId,
    )!.playerIdentityId;

    const missingSession = await noSession.request.post(
      `/api/lobbies/${code}/kick`,
      { headers: { origin }, data: { playerIdentityId: memberId } },
    );
    expect(missingSession.status()).toBe(401);

    const foreignOrigin = await host.request.post(`/api/lobbies/${code}/kick`, {
      headers: { origin: "https://evil.example" },
      data: { playerIdentityId: memberId },
    });
    expect(foreignOrigin.status()).toBe(403);

    const injectedActor = await host.request.post(`/api/lobbies/${code}/kick`, {
      headers: { origin },
      data: { playerIdentityId: memberId, actorPlayerIdentityId: memberId },
    });
    expect(injectedActor.status()).toBe(400);

    for (const [request, targetId] of [
      [host.request, hostPlayerIdentityId],
      [host.request, "not-a-member"],
      [member.request, memberId],
      [outsider.request, memberId],
    ] as const) {
      const denied = await request.post(`/api/lobbies/${code}/kick`, {
        headers: { origin },
        data: { playerIdentityId: targetId },
      });
      expect(denied.status()).toBe(403);
      expect(await denied.json()).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });
    }

    const badCode = await host.request.post("/api/lobbies/AAAAAA/kick", {
      headers: { origin },
      data: { playerIdentityId: memberId },
    });
    expect(badCode.status()).toBe(403);
    expect(await badCode.json()).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    const outsiderExistingRoom = await outsider.request.post(
      `/api/lobbies/${code}/kick`,
      { headers: { origin }, data: { playerIdentityId: memberId } },
    );
    expect(outsiderExistingRoom.status()).toBe(403);
    const outsiderUnknownRoom = await outsider.request.post(
      "/api/lobbies/ZZZZZZ/kick",
      { headers: { origin }, data: { playerIdentityId: memberId } },
    );
    expect(outsiderUnknownRoom.status()).toBe(403);
    expect(await outsiderUnknownRoom.json()).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    const unrelatedBefore = await unrelatedHost.request.get("/api/lobbies/me");
    const unrelatedBeforeValue = (await unrelatedBefore.json()).value;
    const hostOtherRoom = await host.request.post(
      `/api/lobbies/${unrelatedRoom.code}/kick`,
      { headers: { origin }, data: { playerIdentityId: memberId } },
    );
    expect(hostOtherRoom.status()).toBe(403);
    const hostUnknownRoom = await host.request.post(
      "/api/lobbies/ZZZZZZ/kick",
      { headers: { origin }, data: { playerIdentityId: memberId } },
    );
    expect(hostUnknownRoom.status()).toBe(403);
    const unchangedPrimaryRoom = await host.request.get("/api/lobbies/me");
    expect((await unchangedPrimaryRoom.json()).value.members).toHaveLength(2);
    const unchangedUnrelatedRoom =
      await unrelatedHost.request.get("/api/lobbies/me");
    const unchangedValue = (await unchangedUnrelatedRoom.json()).value;
    expect(unchangedValue.members).toHaveLength(1);
    expect(unchangedValue.version).toBe(unrelatedBeforeValue.version);
    const malformedCode = await host.request.post("/api/lobbies/0ABCDE/kick", {
      headers: { origin },
      data: { playerIdentityId: memberId },
    });
    expect(malformedCode.status()).toBe(400);
    const malformedBody = await host.request.post(`/api/lobbies/${code}/kick`, {
      headers: { origin },
      data: { playerIdentityId: 3 },
    });
    expect(malformedBody.status()).toBe(400);

    const emptyBody = await host.request.post(`/api/lobbies/${code}/kick`, {
      headers: { origin },
      data: {},
    });
    expect(emptyBody.status()).toBe(400);
  } finally {
    await Promise.all(
      [host, member, outsider, unrelatedHost, noSession].map((context) =>
        context.close(),
      ),
    );
  }
});

test("a persisted ban follows the same account across a fresh session cookie and stays room-scoped", async ({
  browser,
}) => {
  const host = await newContext(browser);
  const target = await newContext(browser);
  const secondRoomHost = await newContext(browser);
  try {
    await account(host.request, "scopehost");
    const targetUsername = await account(target.request, "scopetarget");
    await account(secondRoomHost.request, "othrhost");
    const roomA = await createRoom(host.request);
    const roomB = await createRoom(secondRoomHost.request);
    const targetRoom = await join(target.request, roomA.code);
    const targetId = targetRoom.members.find(
      (entry) => entry.playerIdentityId !== roomA.hostPlayerIdentityId,
    )!.playerIdentityId;
    const expelled = await host.request.post(
      `/api/lobbies/${roomA.code}/kick`,
      {
        headers: { origin },
        data: { playerIdentityId: targetId },
      },
    );
    expect(expelled.status()).toBe(200);

    const freshSession = await newContext(browser);
    try {
      await login(freshSession.request, targetUsername);
      const bannedJoin = await freshSession.request.post("/api/lobbies/join", {
        headers: { origin },
        data: { code: roomA.code, role: "PARTICIPANT" },
      });
      expect(bannedJoin.status()).toBe(403);
      expect(await bannedJoin.json()).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });
      const allowedJoinElsewhere = await freshSession.request.post(
        "/api/lobbies/join",
        {
          headers: { origin },
          data: { code: roomB.code, role: "PARTICIPANT" },
        },
      );
      expect(allowedJoinElsewhere.status()).toBe(200);
      const allowedElsewhere = await freshSession.request.post(
        `/api/lobbies/${roomB.code}/heartbeat`,
        { headers: { origin }, data: {} },
      );
      expect(allowedElsewhere.status()).toBe(200);
    } finally {
      await freshSession.close();
    }
  } finally {
    await Promise.all(
      [host, target, secondRoomHost].map((context) => context.close()),
    );
  }
});

test("a simultaneous replay of one expulsion commits exactly once", async ({
  browser,
}) => {
  const host = await newContext(browser);
  const target = await newContext(browser);
  try {
    await account(host.request, "racehost");
    await guest(target.request, "Replay target");
    const { code, hostPlayerIdentityId } = await createRoom(host.request);
    const joined = await join(target.request, code);
    const targetId = joined.members.find(
      (member) => member.playerIdentityId !== hostPlayerIdentityId,
    )!.playerIdentityId;
    const results = await Promise.all(
      [0, 1].map(() =>
        host.request.post(`/api/lobbies/${code}/kick`, {
          headers: { origin },
          data: { playerIdentityId: targetId },
        }),
      ),
    );
    expect(results.map((response) => response.status()).sort()).toEqual([
      200, 403,
    ]);
    const retry = await target.request.post("/api/lobbies/join", {
      headers: { origin },
      data: { code, role: "PARTICIPANT" },
    });
    expect(retry.status()).toBe(403);
    const current = await host.request.get("/api/lobbies/me");
    expect((await current.json()).value.members).toHaveLength(1);
  } finally {
    await Promise.all([host, target].map((context) => context.close()));
  }
});

test("only the current host can expel after host succession", async ({
  browser,
}) => {
  const formerHost = await newContext(browser);
  const successor = await newContext(browser);
  const firstTarget = await newContext(browser);
  const secondTarget = await newContext(browser);
  try {
    await account(formerHost.request, "oldhost");
    await account(successor.request, "newhost");
    await guest(firstTarget.request, "First target");
    await guest(secondTarget.request, "Second target");
    const { code, hostPlayerIdentityId } = await createRoom(formerHost.request);
    const succession = await join(successor.request, code);
    const successorId = succession.members.find(
      (member) => member.playerIdentityId !== hostPlayerIdentityId,
    )!.playerIdentityId;
    const first = await join(firstTarget.request, code);
    const second = await join(secondTarget.request, code);
    const firstId = first.members.find(
      (member) =>
        member.playerIdentityId !== hostPlayerIdentityId &&
        member.playerIdentityId !== successorId,
    )!.playerIdentityId;
    const secondId = second.members.find(
      (member) =>
        member.playerIdentityId !== hostPlayerIdentityId &&
        member.playerIdentityId !== successorId &&
        member.playerIdentityId !== firstId,
    )!.playerIdentityId;

    const leave = await formerHost.request.post(`/api/lobbies/${code}/leave`, {
      headers: { origin },
      data: {},
    });
    expect(leave.status()).toBe(200);
    expect((await leave.json()).value.hostPlayerIdentityId).toBe(successorId);

    const staleHostKick = await formerHost.request.post(
      `/api/lobbies/${code}/kick`,
      { headers: { origin }, data: { playerIdentityId: secondId } },
    );
    expect(staleHostKick.status()).toBe(403);
    const successorKick = await successor.request.post(
      `/api/lobbies/${code}/kick`,
      { headers: { origin }, data: { playerIdentityId: firstId } },
    );
    expect(successorKick.status()).toBe(200);
    const nextKick = await successor.request.post(`/api/lobbies/${code}/kick`, {
      headers: { origin },
      data: { playerIdentityId: secondId },
    });
    expect(nextKick.status()).toBe(200);
  } finally {
    await Promise.all(
      [formerHost, successor, firstTarget, secondTarget].map((context) =>
        context.close(),
      ),
    );
  }
});
