import { afterAll, expect, it } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { DefaultLobbySupervisor } from "@/modules/lobby/supervisors/implementations/default-lobby-supervisor";
import { PrismaLobbyRepository } from "@/modules/lobby/repositories/implementations/prisma-lobby-repository";
import { invitationTokens } from "@/modules/lobby/infrastructure/invitation-tokens";
afterAll(() => prisma.$disconnect());
async function actor() {
  const id = crypto.randomUUID();
  await prisma.user.create({
    data: {
      id,
      name: "Invite Test",
      email: `${id}@example.test`,
      playerIdentity: { create: { id } },
    },
  });
  return {
    playerIdentityId: id,
    kind: "account" as const,
    displayName: "Invite Test",
  };
}
it("atomically allows one concurrent recipient and keeps digests out of snapshots", async () => {
  const service = new DefaultLobbySupervisor(
    new PrismaLobbyRepository(prisma),
    Date.now,
    invitationTokens,
  );
  const [host, first, second] = await Promise.all([actor(), actor(), actor()]);
  const room = await service.createLobby(
    { name: "Invite", capacity: 3, role: "PARTICIPANT" },
    host,
  );
  if (!room.ok) throw Error("Room missing");
  expect(await service.createInvitation(room.value.code, first)).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
  const invite = await service.createInvitation(room.value.code, host);
  if (!invite.ok) throw Error("Invite missing");
  const raw = await prisma.lobby.findUniqueOrThrow({
    where: { code: room.value.code },
    select: { invitationLinks: true },
  });
  expect(JSON.stringify(raw).includes(invite.value.token)).toBe(false);
  const results = await Promise.all(
    [first, second].map((person) =>
      service.joinLobby(
        room.value.code,
        "PARTICIPANT",
        person,
        undefined,
        invite.value.token,
      ),
    ),
  );
  expect(results.filter((result) => result.ok)).toHaveLength(1);
  expect(results.filter((result) => !result.ok)).toHaveLength(1);
  const winner = results[0].ok ? first : second;
  const snapshot = await service.observeLobby(room.value.code, host);
  expect(JSON.stringify(snapshot).includes("invitationLinks")).toBe(false);
  expect(
    await service.joinLobby(
      room.value.code,
      "PARTICIPANT",
      winner,
      undefined,
      invite.value.token,
    ),
  ).toMatchObject({ ok: true });
  await service.leaveLobby(room.value.code, winner);
  expect(
    await service.joinLobby(
      room.value.code,
      "PARTICIPANT",
      winner,
      undefined,
      invite.value.token,
    ),
  ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
});
it("rolls back consumption when the recipient already has another room", async () => {
  const service = new DefaultLobbySupervisor(
    new PrismaLobbyRepository(prisma),
    Date.now,
    invitationTokens,
  );
  const [host, occupied, other] = await Promise.all([
    actor(),
    actor(),
    actor(),
  ]);
  const room = await service.createLobby(
    { name: "Invite", capacity: 3, role: "PARTICIPANT" },
    host,
  );
  await service.createLobby(
    { name: "Other", capacity: 3, role: "PARTICIPANT" },
    occupied,
  );
  if (!room.ok) throw Error("Room missing");
  const invite = await service.createInvitation(room.value.code, host);
  if (!invite.ok) throw Error("Invite missing");
  expect(
    await service.joinLobby(
      room.value.code,
      "PARTICIPANT",
      occupied,
      undefined,
      invite.value.token,
    ),
  ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  expect(
    await service.joinLobby(
      room.value.code,
      "PARTICIPANT",
      other,
      undefined,
      invite.value.token,
    ),
  ).toMatchObject({ ok: true });
});
