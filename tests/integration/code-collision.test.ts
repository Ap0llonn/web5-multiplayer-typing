import { it, expect, vi } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaLobbyRepository } from "@/modules/lobby/repositories/implementations/prisma-lobby-repository";
import * as rules from "@/modules/lobby/domain/lobby-rules";
async function actor(id: string) {
  await prisma.user.create({
    data: {
      id,
      name: id,
      email: `${id}@example.test`,
      playerIdentity: { create: { id: `p-${id}` } },
    },
  });
  return {
    playerIdentityId: `p-${id}`,
    kind: "account" as const,
    displayName: id,
  };
}
it("retries a forced code collision and rolls back every exhausted attempt", async () => {
  const [a, b, c] = await Promise.all([
    actor("collision-a"),
    actor("collision-b"),
    actor("collision-c"),
  ]);
  const repo = new PrismaLobbyRepository(prisma);
  const make = (who: typeof a) => {
    const result = rules.createRoom(
      { name: "Collision", capacity: 2, role: "PARTICIPANT" },
      who,
      "ABC234",
      0,
    );
    if (!result.ok) throw Error();
    return result.value;
  };
  const first = await repo.create(make(a));
  expect(first.ok).toBe(true);
  const generate = vi.spyOn(rules, "createCode").mockReturnValue("XYZ789");
  try {
    const second = await repo.create(make(b));
    expect(second).toMatchObject({ ok: true, value: { code: "XYZ789" } });
    expect(generate).toHaveBeenCalledTimes(1);
    generate.mockReset().mockReturnValue("ABC234");
    const before = await prisma.lobby.count();
    const exhausted = await repo.create(make(c));
    expect(exhausted).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(generate).toHaveBeenCalledTimes(5);
    expect(await prisma.lobby.count()).toBe(before);
    expect(
      await prisma.lobbyMember.count({
        where: { playerIdentityId: c.playerIdentityId },
      }),
    ).toBe(0);
  } finally {
    generate.mockRestore();
  }
});
