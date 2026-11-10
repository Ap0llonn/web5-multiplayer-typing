import { readRaceArchive } from "@/modules/lobby/server";
import { generateRaceText } from "@/modules/lobby/domain/race-text";
import { afterAll, expect, it } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { getCurrentActor } from "@/modules/identity/server";
import { getLobbyService } from "@/modules/lobby/server";
import { PrismaLobbyRepository } from "@/modules/lobby/repositories/implementations/prisma-lobby-repository";
import { PrismaRaceTextRepository } from "@/modules/lobby/repositories/implementations/prisma-race-text-repository";
import { DefaultRaceSupervisor } from "@/modules/lobby/supervisors/implementations/default-race-supervisor";
import { handleRaceCommand } from "@/composition/lobby/race-http";
import { signup, testRequest } from "../support/auth";

afterAll(() => prisma.$disconnect());
async function setup() {
  const auth = createAuthentication();
  const account = await signup(
    auth,
    `race${crypto.randomUUID().replaceAll("-", "").slice(0, 14)}`,
  );
  const guestResponse = await testRequest(
    auth,
    "/sign-in/anonymous",
    { name: "Race Guest" },
    undefined,
    "192.0.2.89",
  );
  const guestCookie =
    guestResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
  const host = await getCurrentActor(new Headers({ cookie: account.cookie }));
  const guest = await getCurrentActor(new Headers({ cookie: guestCookie }));
  if (!host.ok || !guest.ok) throw Error("Session setup failed");
  const room = await getLobbyService().createLobby(
    { name: "Race test", capacity: 3, role: "PARTICIPANT" },
    host.value,
  );
  if (!room.ok) throw Error(room.error.code);
  await getLobbyService().joinLobby(
    room.value.code,
    "PARTICIPANT",
    guest.value,
  );
  let now = Date.now();
  const races = new DefaultRaceSupervisor(
    new PrismaLobbyRepository(prisma),
    new PrismaRaceTextRepository(prisma),
    () => now,
  );
  return {
    host: host.value,
    guest: guest.value,
    code: room.value.code,
    cookie: account.cookie,
    races,
    time: () => now,
    tick(ms: number) {
      now += ms;
    },
  };
}
it("locks concurrent starts and rejects outsider/spectator edits, stale batches and mid-race joins", async () => {
  const s = await setup();
  const results = await Promise.all([
    s.races.start(s.code, s.host),
    s.races.start(s.code, s.host),
  ]);
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  const started = results.find((r) => r.ok);
  if (!started?.ok || !started.value.race) throw Error("Race missing");
  expect(await s.races.start(s.code, s.guest)).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
  expect(
    await getLobbyService().joinLobby(s.code, "SPECTATOR", {
      ...s.guest,
      playerIdentityId: "outsider",
    }),
  ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  s.tick(5000);
  const input = {
    raceId: started.value.race.id,
    sequence: 1,
    edits: [started.value.race.text[0]],
  };
  expect(await s.races.edit(s.code, s.host, input)).toMatchObject({ ok: true });
  expect(await s.races.edit(s.code, s.host, input)).toMatchObject({ ok: true });
  expect(
    await s.races.edit(s.code, s.host, { ...input, sequence: 3 }),
  ).toMatchObject({ ok: false });
  const outsider = await s.races.edit(
    s.code,
    { ...s.guest, playerIdentityId: "outsider" },
    input,
  );
  expect(outsider).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
});
it("resumes the author's draft, hides it from peers, atomically saves human results and replays", async () => {
  const s = await setup();
  const start = await s.races.start(s.code, s.host);
  if (!start.ok || !start.value.race) throw Error("Race missing");
  const race = start.value.race;
  s.tick(5000);
  await s.races.edit(s.code, s.host, {
    raceId: race.id,
    sequence: 1,
    edits: [race.text[0], race.text[1]],
  });
  const hostView = await s.races.edit(s.code, s.host, {
    raceId: race.id,
    sequence: 1,
    edits: [race.text[0]],
  });
  expect(hostView).toMatchObject({
    ok: true,
    value: { race: { self: { draft: race.text.slice(0, 2), sequence: 1 } } },
  });
  const peerView = await s.races.abandon(s.code, s.guest);
  expect(peerView).toMatchObject({
    ok: true,
    value: { race: { self: { draft: "" } } },
  });
  await s.races.abandon(s.code, s.host);
  const saved = await prisma.raceResult.findMany({
    where: { raceId: race.id },
  });
  expect(saved).toHaveLength(2);
  const archive = await readRaceArchive(race.id, s.host.playerIdentityId);
  expect(archive.ok && archive.value.players).toHaveLength(2);
  expect(
    archive.ok && archive.value.players.map((p) => p.displayName),
  ).toContain(s.guest.displayName);
  expect(archive.ok && JSON.stringify(archive.value)).not.toContain('"draft"');
  expect(await readRaceArchive(race.id, "outsider")).toMatchObject({
    ok: false,
    error: { code: "NOT_FOUND" },
  });

  expect(saved.map((row) => row.playerIdentityId)).toContain(
    s.host.playerIdentityId,
  );
  expect(await s.races.reset(s.code, s.host, false)).toMatchObject({
    ok: true,
    value: { state: "WAITING", race: null },
  });
  expect((await readRaceArchive(race.id, s.host.playerIdentityId)).ok).toBe(
    true,
  );
  expect(await s.races.start(s.code, s.host)).toMatchObject({
    ok: true,
    value: { state: "COUNTDOWN" },
  });
  expect(await prisma.raceResult.count({ where: { raceId: race.id } })).toBe(2);
  await getLobbyService().leaveLobby(s.code, s.host);
  expect(
    (await prisma.lobby.findUnique({ where: { code: s.code } }))?.race,
  ).toBeNull();
});
it("persists a race that reaches its deadline before accepting a replay request", async () => {
  const s = await setup();
  await s.races.configure(s.code, s.host, {
    language: "en",
    wordCount: 10,
    durationSeconds: 30,
    correction: "required",
  });
  const started = await s.races.start(s.code, s.host);
  if (!started.ok || !started.value.race) throw Error("Race missing");
  s.tick(20000);
  await prisma.lobbyMember.updateMany({
    where: { lobby: { code: s.code } },
    data: { lastSeenAt: new Date(s.time()) },
  });
  s.tick(13000);
  expect(await s.races.reset(s.code, s.host, false)).toMatchObject({
    ok: false,
    error: { code: "CONFLICT" },
  });
  expect(
    await prisma.raceResult.count({ where: { raceId: started.value.race.id } }),
  ).toBe(2);
  expect(await s.races.reset(s.code, s.host, false)).toMatchObject({
    ok: true,
    value: { state: "WAITING" },
  });
});
it("validates authenticated same-origin commands and rejects forged actor/score fields", async () => {
  const s = await setup();
  const request = (
    body: unknown,
    origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    cookie = s.cookie,
  ) =>
    new Request(`http://localhost:3000/api/lobbies/${s.code}/race/start`, {
      method: "POST",
      headers: { origin, cookie, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  expect(
    (
      await handleRaceCommand(
        request({}, "https://foreign.example"),
        s.code,
        "start",
      )
    ).status,
  ).toBe(403);
  expect(
    (await handleRaceCommand(request({}, undefined, ""), s.code, "start"))
      .status,
  ).toBe(401);
  expect(
    (
      await handleRaceCommand(
        request({ playerIdentityId: s.guest.playerIdentityId, wpm: 999 }),
        s.code,
        "start",
      )
    ).status,
  ).toBe(400);
  expect((await handleRaceCommand(request({}), s.code, "start")).status).toBe(
    200,
  );
});

it("persists automatic pickups and effects atomically, rejects foreign ownership and ignores concurrent legacy retries", async () => {
  const s = await setup();
  const start = await s.races.start(s.code, s.host);
  if (!start.ok || !start.value.race) throw Error("Race missing");
  const race = start.value.race;
  s.tick(5000);
  const length = Math.ceil(race.text.length / 4);
  for (const actor of [s.host, s.guest]) {
    let sequence = 0;
    for (let offset = 0; offset < length; offset += 32) {
      s.tick(1200);
      expect(
        await s.races.edit(s.code, actor, {
          raceId: race.id,
          sequence: ++sequence,
          edits: [...race.text.slice(offset, Math.min(length, offset + 32))],
        }),
      ).toMatchObject({ ok: true });
    }
    if (actor === s.host) {
      const checkpoint = await new PrismaLobbyRepository(prisma).findForPlayer(
        s.guest.playerIdentityId,
      );
      expect(
        checkpoint.ok &&
          checkpoint.value?.race?.players.find(
            (p) => p.playerIdentityId === s.guest.playerIdentityId,
          )?.items.length,
      ).toBe(0);
    }
  }
  const repository = new PrismaLobbyRepository(prisma);
  const read = await repository.findForPlayer(s.guest.playerIdentityId);
  if (!read.ok || !read.value?.race) throw Error("Persisted race missing");
  const player = read.value.race.players.find(
    (p) => p.playerIdentityId === s.guest.playerIdentityId,
  );
  if (!player?.items[0]) throw Error("Box missing");
  expect(player.bonusesReceived).toBe(1);
  const input = { raceId: race.id, itemId: player.items[0].id };
  expect(player.items[0].usedAt).toBe(player.items[0].receivedAt);
  const beforeRetry = structuredClone(read.value.race);
  expect(
    beforeRetry.events.filter((event) => event.id === `${input.itemId}:used`),
  ).toHaveLength(1);
  expect(await s.races.useItem(s.code, s.host, input)).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
  expect(
    await s.races.useItem(
      s.code,
      { ...s.guest, playerIdentityId: "outsider" },
      input,
    ),
  ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  const responses = await Promise.all([
    s.races.useItem(s.code, s.guest, input),
    s.races.useItem(s.code, s.guest, input),
  ]);
  expect(responses.every((r) => r.ok)).toBe(true);
  const reloaded = await repository.findForPlayer(s.guest.playerIdentityId);
  if (!reloaded.ok || !reloaded.value?.race) throw Error("Reload failed");
  const after = reloaded.value.race.players.find(
    (p) => p.playerIdentityId === s.guest.playerIdentityId,
  );
  expect(reloaded.value.race).toEqual(beforeRetry);
  expect(after?.correct).toBe(length);
  expect(after?.items[0].usedAt).toBe(player.items[0].receivedAt);
});

it("rejects unvalidated item commands including browser-supplied target, type and identity", async () => {
  const s = await setup();
  for (const body of [
    { raceId: "race", itemId: "item", type: "shortcut" },
    { raceId: "race", itemId: "item", targetId: s.guest.playerIdentityId },
    {
      raceId: "race",
      itemId: "item",
      playerIdentityId: s.guest.playerIdentityId,
    },
    { raceId: "race" },
  ]) {
    const request = new Request(
      `http://localhost:3000/api/lobbies/${s.code}/race/item`,
      {
        method: "POST",
        headers: {
          cookie: s.cookie,
          origin: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    expect((await handleRaceCommand(request, s.code, "item")).status).toBe(400);
  }
});

it("persists every configuration field under the room lock, rejects overcapacity atomically and counts bots on concurrent joins", async () => {
  const s = await setup();
  const settings = {
    language: "fr" as const,
    wordCount: 15,
    durationSeconds: null,
    correction: "free" as const,
    mode: "random" as const,
    complexity: "easy" as const,
    punctuation: false,
    numbers: false,
    uppercase: false,
    accents: true,
    includeCharacters: "é",
    excludeCharacters: "z",
    bonuses: false,
    bots: [{ id: "training", level: 5 as const }],
    capacity: 3,
    visibility: "PUBLIC" as const,
  };
  expect(await s.races.configure(s.code, s.guest, settings)).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
  const configured = await s.races.configure(s.code, s.host, settings);
  expect(configured).toMatchObject({
    ok: true,
    value: { capacity: 3, visibility: "PUBLIC", raceSettings: settings },
  });
  const repo = new PrismaLobbyRepository(prisma);
  expect(await repo.findForPlayer(s.host.playerIdentityId)).toMatchObject({
    ok: true,
    value: { visibility: "PUBLIC", raceSettings: settings },
  });
  const before = await prisma.lobby.findUniqueOrThrow({
    where: { code: s.code },
  });
  expect(
    await s.races.configure(s.code, s.host, {
      ...settings,
      capacity: 2,
      visibility: "CODE",
    }),
  ).toMatchObject({ ok: false, error: { code: "ROOM_FULL" } });
  const after = await prisma.lobby.findUniqueOrThrow({
    where: { code: s.code },
  });
  expect(after).toEqual(before);
  const publicRooms = await getLobbyService().listPublicLobbies();
  expect(
    publicRooms.ok && publicRooms.value.find((r) => r.code === s.code),
  ).toMatchObject({ participantCount: 3, capacity: 3 });
  const started = await s.races.start(s.code, s.host);
  expect(started.ok).toBe(true);
  if (!started.ok || !started.value.race) throw Error("Missing generated race");
  expect(started.value.race.text.split(" ")).toHaveLength(15);
  expect(started.value.race.text).toContain("é");
  expect(started.value.race.text).not.toMatch(/[zA-Z0-9.,!?]/);
  expect(
    started.value.race.players.filter((p) => p.kind === "bot"),
  ).toHaveLength(1);
  expect(
    await prisma.playerIdentity.findMany({
      where: { id: { startsWith: "bot:" } },
    }),
  ).toEqual([]);
  expect(await s.races.configure(s.code, s.host, settings)).toMatchObject({
    ok: false,
    error: { code: "CONFLICT" },
  });
  s.tick(25000);
  await s.races.abandon(s.code, s.host);
  await s.races.abandon(s.code, s.guest);
  const stored = await repo.findForPlayer(s.host.playerIdentityId);
  expect(stored.ok && stored.value?.state).toBe("RESULTS");
  expect(
    await prisma.raceResult.count({ where: { raceId: started.value.race.id } }),
  ).toBe(2);
  expect(
    await s.races.configure(s.code, s.host, {
      ...settings,
      bots: [],
      visibility: "CODE",
      capacity: 2,
    }),
  ).toMatchObject({ ok: true });
  const next = await s.races.reset(s.code, s.host, false);
  expect(next).toMatchObject({
    ok: true,
    value: {
      state: "WAITING",
      visibility: "CODE",
      capacity: 2,
      raceSettings: { bots: [] },
    },
  });
});

it("has real sourced bilingual corpus and dictionary data and produces exact-length excerpts in all three tiers", async () => {
  const texts = new PrismaRaceTextRepository(prisma);
  for (const language of ["fr", "en"] as const) {
    const corpus = await texts.findCorpus(language);
    expect(corpus.ok && corpus.value[0].source).toContain(
      "https://www.gutenberg.org/ebooks/",
    );
    const words = await texts.findDictionary(language);
    expect(words.ok && words.value.length).toBeGreaterThan(100);
    if (!corpus.ok || !words.ok) throw Error("Missing corpus");
    for (const complexity of ["easy", "medium", "hard"] as const) {
      for (const mode of ["coherent", "random"] as const) {
        const generated = generateRaceText(
          {
            language,
            wordCount: 100,
            durationSeconds: 600,
            correction: "required",
            complexity,
            mode,
            punctuation: false,
            numbers: false,
            uppercase: false,
            accents: false,
          },
          corpus.value,
          words.value,
          () => 0,
        );
        if (!generated.ok) throw Error("No generated text");
        expect(generated.value.split(" ")).toHaveLength(100);
        expect(generated.value).not.toMatch(/[A-ZÀ-ÖØ-Þ0-9.,!?éèàç]/);
      }
    }
  }
});

it("serializes a bot addition against a human joining the last participant seat", async () => {
  const s = await setup();
  const auth = createAuthentication();
  const response = await testRequest(
    auth,
    "/sign-in/anonymous",
    { name: "Third racer" },
    undefined,
    "192.0.2.106",
  );
  const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
  const third = await getCurrentActor(new Headers({ cookie }));
  if (!third.ok) throw Error("Guest session missing");
  const results = await Promise.all([
    s.races.configure(s.code, s.host, {
      language: "en",
      wordCount: 10,
      durationSeconds: 30,
      correction: "required",
      bots: [{ id: "last-seat", level: 3 }],
      capacity: 3,
    }),
    getLobbyService().joinLobby(s.code, "PARTICIPANT", third.value),
  ]);
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  expect(results.find((r) => !r.ok)).toMatchObject({
    error: { code: "ROOM_FULL" },
  });
  const room = await new PrismaLobbyRepository(prisma).findForPlayer(
    s.host.playerIdentityId,
  );
  if (!room.ok || !room.value) throw Error("Room missing");
  expect(
    room.value.members.filter((m) => m.role === "PARTICIPANT").length +
      (room.value.raceSettings?.bots?.length ?? 0),
  ).toBe(3);
});
