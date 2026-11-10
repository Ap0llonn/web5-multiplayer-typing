import { afterAll, expect, it } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaProfileRepository } from "@/modules/identity/repositories/implementations/prisma-profile-repository";
afterAll(() => prisma.$disconnect());
it("reads a selected player's photo by stable identity without returning another photo", async () => {
  const id = crypto.randomUUID();
  const identityId = crypto.randomUUID();
  await prisma.user.create({
    data: {
      id,
      name: "Photo",
      email: `${id}@example.test`,
      isAnonymous: false,
      playerIdentity: { create: { id: identityId } },
      profilePhoto: { create: { data: new Uint8Array([1, 2, 3]) } },
    },
  });
  try {
    const repository = new PrismaProfileRepository(prisma);
    expect(await repository.readPhoto("unused", identityId)).toMatchObject({
      ok: true,
      value: new Uint8Array([1, 2, 3]),
    });
    expect(await repository.readPhoto("unused", "missing")).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  } finally {
    await prisma.playerIdentity.delete({ where: { id: identityId } });
    await prisma.user.delete({ where: { id } });
  }
});
