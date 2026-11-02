import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { DefaultLobbySupervisor } from "@/modules/lobby/supervisors/implementations/default-lobby-supervisor";
import { PrismaLobbyRepository } from "@/modules/lobby/repositories/implementations/prisma-lobby-repository";
import { handlePublicLobbies } from "@/composition/lobby/http";

async function actor(name: string) {
  const id = randomUUID();
  await prisma.user.create({
    data: {
      id,
      name,
      email: `${id}@example.test`,
      playerIdentity: { create: { id } },
    },
  });
  return { playerIdentityId: id, kind: "account" as const, displayName: name };
}
it("publishes only live public summaries, counts participants separately and never renews presence", async () => {
  let now = Date.now();
  const service = new DefaultLobbySupervisor(
    new PrismaLobbyRepository(prisma),
    () => now,
  );
  const [host, hiddenHost, expiredHost, player, spectator] = await Promise.all([
    actor("Public Host"),
    actor("Code Host"),
    actor("Expired Host"),
    actor("Participant"),
    actor("Observer"),
  ]);
  const publicRoom = await service.createLobby(
    { name: "Visible", capacity: 2, role: "SPECTATOR", visibility: "PUBLIC" },
    host,
  );
  const hidden = await service.createLobby(
    { name: "Hidden", capacity: 2, role: "PARTICIPANT" },
    hiddenHost,
  );
  const expired = await service.createLobby(
    { name: "Expired", capacity: 2, role: "PARTICIPANT", visibility: "PUBLIC" },
    expiredHost,
  );
  if (!publicRoom.ok || !hidden.ok || !expired.ok)
    throw Error("Room setup failed");
  await service.joinLobby(publicRoom.value.code, "PARTICIPANT", {
    ...player,
    kind: "guest",
  });
  await service.joinLobby(publicRoom.value.code, "SPECTATOR", {
    ...spectator,
    kind: "guest",
  });
  const list = await service.listPublicLobbies();
  expect(list).toMatchObject({ ok: true });
  if (!list.ok) return;
  const summary = list.value.find(
    (room) => room.code === publicRoom.value.code,
  );
  expect(summary).toEqual({
    code: publicRoom.value.code,
    name: "Visible",
    capacity: 2,
    participantCount: 1,
    spectatorCount: 2,
    hostName: "Public Host",
    state: "WAITING",
  });
  expect(list.value.some((room) => room.code === hidden.value.code)).toBe(
    false,
  );
  expect(JSON.stringify(summary)).not.toMatch(
    /playerIdentityId|members|banned|lastSeenAt|email/,
  );
  const before = await prisma.lobbyMember.findMany({
    where: { lobbyId: publicRoom.value.id },
    orderBy: { id: "asc" },
  });
  now += 30_001;
  expect(await service.listPublicLobbies()).toEqual({ ok: true, value: [] });
  expect(
    await prisma.lobbyMember.findMany({
      where: { lobbyId: publicRoom.value.id },
      orderBy: { id: "asc" },
    }),
  ).toEqual(before);
});
it("public GET is anonymous, uncached, validates query and hides closed/code rooms", async () => {
  const host = await actor("Directory Host");
  const service = new DefaultLobbySupervisor(new PrismaLobbyRepository(prisma));
  const room = await service.createLobby(
    {
      name: "Directory",
      capacity: 2,
      role: "PARTICIPANT",
      visibility: "PUBLIC",
    },
    host,
  );
  if (!room.ok) throw Error(room.error.code);
  const request = () => new Request("http://localhost:3000/api/lobbies");
  const response = await handlePublicLobbies(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toMatchObject({
    ok: true,
    value: expect.arrayContaining([
      expect.objectContaining({ code: room.value.code }),
    ]),
  });
  expect(
    (
      await handlePublicLobbies(
        new Request("http://localhost:3000/api/lobbies?visibility=CODE"),
      )
    ).status,
  ).toBe(400);
  await service.leaveLobby(room.value.code, host);
  const closed = await handlePublicLobbies(request());
  const body: { ok: true; value: Array<{ code: string }> } =
    await closed.json();
  expect(body.value.some((item) => item.code === room.value.code)).toBe(false);
});
