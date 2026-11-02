import { expect, it, vi } from "vitest";
import { createRoom } from "@/modules/lobby/domain/lobby-rules";
import { DefaultLobbySupervisor } from "@/modules/lobby/supervisors/implementations/default-lobby-supervisor";
import type { LobbyRepository } from "@/modules/lobby/repositories/interfaces/lobby-repository";
import { failure, success } from "@/shared/contracts/operation-result";

function candidate(id: string, capacity = 3, createdAt = 0) {
  const room = createRoom(
    { name: id, capacity, role: "PARTICIPANT", visibility: "PUBLIC" },
    { playerIdentityId: id, kind: "account", displayName: id },
    "ABC234",
    40_000,
  );
  if (!room.ok) throw Error(room.error.code);
  room.value.id = id;
  return { room: room.value, createdAt };
}
function setup(candidates: ReturnType<typeof candidate>[]) {
  const repository: LobbyRepository = {
    create: vi.fn(),
    mutate: vi.fn(),
    refreshPresence: vi.fn(),
    findForPlayer: vi.fn(),
    findPublicLobbies: vi.fn(),
    findQuickLobbyCandidates: vi.fn().mockResolvedValue(success(candidates)),
  };
  return {
    repository,
    service: new DefaultLobbySupervisor(repository, () => 40_000),
  };
}
it("chooses fewest free participant slots, then oldest creation, then stable ID regardless of input order", async () => {
  const older = candidate("a", 2, 1);
  older.room.members[0].role = "SPECTATOR";
  const newer = candidate("b", 3, 2);
  const tied = candidate("z", 3, 1);
  const larger = candidate("large", 30, 0);
  const { service } = setup([newer, tied, larger, older]);
  expect(await service.findQuickLobby()).toMatchObject({
    ok: true,
    value: { name: "a", participantCount: 0, spectatorCount: 1 },
  });
  const closest = candidate("closest", 2, 50);
  expect(await setup([older, closest]).service.findQuickLobby()).toMatchObject({
    ok: true,
    value: { name: "closest" },
  });
});
it("ignores private, full, racing, countdown, closed, hostless and banned rooms without mutating presence", async () => {
  const hidden = candidate("hidden", 2);
  hidden.room.visibility = "CODE";
  const full = candidate("full", 2);
  full.room.members.push({
    ...full.room.members[0],
    playerIdentityId: "guest",
    kind: "guest",
  });
  const racing = candidate("racing", 2);
  racing.room.state = "RACING";
  const countdown = candidate("countdown", 2);
  countdown.room.state = "COUNTDOWN";
  const closed = candidate("closed", 2);
  closed.room.state = "CLOSED";
  const expired = candidate("expired", 2);
  expired.room.members[0].lastSeenAt = 9_999;
  const banned = candidate("banned", 2);
  banned.room.bannedPlayerIdentityIds.push("visitor");
  const eligible = candidate("eligible", 3);
  eligible.room.state = "RESULTS";
  const expiredGuest = {
    ...eligible.room.members[0],
    playerIdentityId: "old-guest",
    kind: "guest" as const,
    lastSeenAt: 9_999,
  };
  eligible.room.members.push(expiredGuest);
  const rooms = [
    hidden,
    full,
    racing,
    countdown,
    closed,
    expired,
    banned,
    eligible,
  ];
  const before = structuredClone(rooms);
  const { service, repository } = setup(rooms);
  expect(await service.findQuickLobby("visitor")).toMatchObject({
    ok: true,
    value: { name: "eligible", participantCount: 1 },
  });
  expect(rooms).toEqual(before);
  expect(repository.mutate).not.toHaveBeenCalled();
  expect(repository.refreshPresence).not.toHaveBeenCalled();
});
it("searches beyond the first directory page", async () => {
  const page = Array.from({ length: 100 }, (_, i) =>
    candidate(String(i).padStart(3, "0"), 30),
  );
  const { repository, service } = setup(page);
  vi.mocked(repository.findQuickLobbyCandidates)
    .mockResolvedValueOnce(success(page))
    .mockResolvedValueOnce(success([candidate("winner", 2)]));
  expect(await service.findQuickLobby()).toMatchObject({
    ok: true,
    value: { name: "winner" },
  });
  expect(repository.findQuickLobbyCandidates).toHaveBeenNthCalledWith(
    2,
    10_000,
    "099",
  );
});
it("returns a real empty result and propagates failures including later pages", async () => {
  expect(await setup([]).service.findQuickLobby()).toEqual(success(null));
  const { repository, service } = setup([]);
  vi.mocked(repository.findQuickLobbyCandidates).mockResolvedValue(
    failure("INTERNAL"),
  );
  expect(await service.findQuickLobby()).toEqual(failure("INTERNAL"));
  const page = Array.from({ length: 100 }, (_, i) => candidate(String(i)));
  vi.mocked(repository.findQuickLobbyCandidates)
    .mockResolvedValueOnce(success(page))
    .mockResolvedValueOnce(failure("INTERNAL"));
  expect(await service.findQuickLobby()).toEqual(failure("INTERNAL"));
});
