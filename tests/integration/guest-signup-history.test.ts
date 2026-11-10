import { afterAll, expect, it } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { preserveGuestOnSignup } from "@/composition/auth/guest-signup";
import { getCurrentActor } from "@/modules/identity/server";
import { readProfileMetrics } from "@/modules/lobby/server";
import { saveRaceResults } from "@/modules/lobby/repositories/implementations/race-storage";
import { createRoom, joinRoom } from "@/modules/lobby/domain/lobby-rules";
import { startRace, editRace } from "@/modules/lobby/domain/race-rules";
import { testRequest } from "../support/auth";
afterAll(() => prisma.$disconnect());
it("retains guest finishes through signup and a fresh login, without transferring another guest", async () => {
  const auth = createAuthentication(preserveGuestOnSignup);
  const otherGuest = await testRequest(
    auth,
    "/sign-in/anonymous",
    { name: "Other Guest" },
    undefined,
    "192.0.2.201",
  );
  const otherCookie = otherGuest.headers.get("set-cookie")?.split(";")[0] ?? "";
  const otherActor = await getCurrentActor(
    new Headers({ cookie: otherCookie }),
  );
  if (!otherActor.ok) throw Error("other guest");
  const guest = await testRequest(auth, "/sign-in/anonymous", {
    name: "Guest Racer",
  });
  const cookie = guest.headers.get("set-cookie")?.split(";")[0] ?? "";
  const actor = await getCurrentActor(new Headers({ cookie }));
  if (!actor.ok) throw Error("guest session");
  const host = {
    ...actor.value,
    playerIdentityId: "host",
    kind: "account" as const,
  };
  const created = createRoom(
    { name: "Race", capacity: 2, role: "PARTICIPANT" },
    host,
    "ABC234",
    0,
  );
  if (!created.ok) throw Error("room");
  const room = created.value;
  joinRoom(room, actor.value, "PARTICIPANT", 0);
  startRace(room, host, "abc", crypto.randomUUID(), 0);
  if (!room.race) throw Error("race");
  editRace(
    room,
    actor.value,
    { raceId: room.race.id, sequence: 1, edits: ["a", "b", "c"] },
    4000,
  );
  editRace(
    room,
    host,
    { raceId: room.race.id, sequence: 1, edits: ["a", "b", "c"] },
    5000,
  );
  // The synthetic host is not a persisted identity; persist the real guest only.
  room.race.players = room.race.players.filter(
    (p) => p.playerIdentityId === actor.value.playerIdentityId,
  );
  await prisma.$transaction((tx) => saveRaceResults(tx, room.race!));
  const username = `g${crypto.randomUUID().replaceAll("-", "").slice(0, 15)}`;
  const signup = await testRequest(
    auth,
    "/sign-up/email",
    {
      name: username,
      username,
      email: `${username}@example.com`,
      password: "test-password-123",
    },
    cookie,
  );
  expect(signup.status).toBe(200);
  const otherAfter = await getCurrentActor(
    new Headers({ cookie: otherCookie }),
  );
  expect(otherAfter).toMatchObject({
    ok: true,
    value: {
      kind: "guest",
      playerIdentityId: otherActor.value.playerIdentityId,
    },
  });
  const newCookie = signup.headers.get("set-cookie")?.split(";")[0] ?? "";
  const account = await getCurrentActor(new Headers({ cookie: newCookie }));
  expect(account).toMatchObject({
    ok: true,
    value: { kind: "account", playerIdentityId: actor.value.playerIdentityId },
  });
  const login = await testRequest(auth, "/sign-in/username", {
    username,
    password: "test-password-123",
  });
  const logged = await getCurrentActor(
    new Headers({
      cookie: login.headers.get("set-cookie")?.split(";")[0] ?? "",
    }),
  );
  expect(logged).toMatchObject({
    ok: true,
    value: { playerIdentityId: actor.value.playerIdentityId },
  });
  const oldSession = await getCurrentActor(new Headers({ cookie }));
  expect(oldSession.ok && oldSession.value.playerIdentityId).not.toBe(
    actor.value.playerIdentityId,
  );
  const metrics = await readProfileMetrics(actor.value.playerIdentityId);
  expect(metrics).toMatchObject({ ok: true, value: { races: 1, wins: 1 } });
  expect(metrics.ok && metrics.value.history[0].raceId).toBe(room.race.id);
});
