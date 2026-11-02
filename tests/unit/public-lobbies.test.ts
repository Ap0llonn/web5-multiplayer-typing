import { expect, it, vi } from "vitest";
import { createRoom } from "@/modules/lobby/domain/lobby-rules";
import { createLobbySchema } from "@/modules/lobby/contracts/lobby-schemas";
import { DefaultLobbySupervisor } from "@/modules/lobby/supervisors/implementations/default-lobby-supervisor";
import type { LobbyRepository } from "@/modules/lobby/repositories/interfaces/lobby-repository";
import { failure } from "@/shared/contracts/operation-result";

const host = {
  playerIdentityId: "host",
  kind: "account" as const,
  displayName: "Host",
};
it("keeps legacy rooms on code and validates explicit public visibility", () => {
  const input = { name: "Room", capacity: 2, role: "PARTICIPANT" as const };
  expect(createRoom(input, host, "ABC234", 0)).toMatchObject({
    ok: true,
    value: { visibility: "CODE" },
  });
  expect(
    createRoom({ ...input, visibility: "PUBLIC" }, host, "ABC234", 0),
  ).toMatchObject({ ok: true, value: { visibility: "PUBLIC" } });
  expect(
    createLobbySchema.safeParse({ ...input, visibility: "PRIVATE" }).success,
  ).toBe(false);
  expect(
    createLobbySchema.safeParse({
      ...input,
      visibility: "PUBLIC",
      hostPlayerIdentityId: "forged",
    }).success,
  ).toBe(false);
});
it("does not turn a database failure into an empty explorer", async () => {
  const repository: LobbyRepository = {
    findQuickLobbyCandidates: vi.fn(),
    create: vi.fn(),
    mutate: vi.fn(),
    refreshPresence: vi.fn(),
    findForPlayer: vi.fn(),
    findPublicLobbies: vi.fn().mockResolvedValue(failure("INTERNAL")),
  };
  const service = new DefaultLobbySupervisor(repository, () => 40_000);
  expect(await service.listPublicLobbies()).toEqual(failure("INTERNAL"));
  expect(repository.findPublicLobbies).toHaveBeenCalledWith(10_000);
});
it("hides on-code/closed/hostless rooms and summarizes only live members with a deterministic successor", async () => {
  const create = (code: string, visibility: "PUBLIC" | "CODE" = "PUBLIC") => {
    const result = createRoom(
      { name: code, capacity: 2, role: "PARTICIPANT", visibility },
      host,
      code,
      0,
    );
    if (!result.ok) throw Error(result.error.code);
    return result.value;
  };
  const visible = create("ABC234");
  visible.members.push(
    {
      playerIdentityId: "account-b",
      kind: "account",
      displayName: "Second",
      role: "SPECTATOR",
      character: "mint",
      joinedAt: 1,
      lastSeenAt: 40_000,
    },
    {
      playerIdentityId: "account-a",
      kind: "account",
      displayName: "Successor",
      role: "PARTICIPANT",
      character: "mint",
      joinedAt: 1,
      lastSeenAt: 40_000,
    },
    {
      playerIdentityId: "guest",
      kind: "guest",
      displayName: "Guest",
      role: "PARTICIPANT",
      character: "mint",
      joinedAt: 2,
      lastSeenAt: 10_000,
    },
  );
  const hidden = create("XYZ234", "CODE");
  hidden.members[0].lastSeenAt = 40_000;
  const closed = create("DEF234");
  closed.state = "CLOSED";
  closed.members[0].lastSeenAt = 40_000;
  const hostless = create("GHT234");
  hostless.members.push({ ...visible.members[3], lastSeenAt: 40_000 });
  const rooms = [visible, hidden, closed, hostless];
  const before = structuredClone(rooms);
  const repository: LobbyRepository = {
    findQuickLobbyCandidates: vi.fn(),
    create: vi.fn(),
    mutate: vi.fn(),
    refreshPresence: vi.fn(),
    findForPlayer: vi.fn(),
    findPublicLobbies: vi.fn().mockResolvedValue({ ok: true, value: rooms }),
  };
  expect(
    await new DefaultLobbySupervisor(
      repository,
      () => 40_000,
    ).listPublicLobbies(),
  ).toEqual({
    ok: true,
    value: [
      {
        code: "ABC234",
        name: "ABC234",
        capacity: 2,
        participantCount: 2,
        spectatorCount: 1,
        hostName: "Successor",
        state: "WAITING",
      },
    ],
  });
  expect(rooms).toEqual(before);
  expect(repository.mutate).not.toHaveBeenCalled();
  expect(repository.refreshPresence).not.toHaveBeenCalled();
});
