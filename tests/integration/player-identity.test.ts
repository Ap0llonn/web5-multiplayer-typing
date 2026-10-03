import { expect, it, afterAll } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { getCurrentActor } from "@/modules/identity/server";
import { PrismaPlayerIdentityRepository } from "@/modules/identity/repositories/implementations/prisma-player-identity-repository";
import { signup } from "../support/auth";
afterAll(() => prisma.$disconnect());
it("upserts concurrently and revalidates expired and revoked sessions", async () => {
  const auth = createAuthentication();
  const { user, cookie } = await signup(auth, `id${Date.now()}`);
  const repo = new PrismaPlayerIdentityRepository(prisma);
  const ids = await Promise.all([
    repo.ensureForAuthUser(user.id),
    repo.ensureForAuthUser(user.id),
  ]);
  expect(ids[0]).toEqual(ids[1]);
  expect(
    await prisma.playerIdentity.count({ where: { authUserId: user.id } }),
  ).toBe(1);
  const headers = new Headers({ cookie });
  const actor = await getCurrentActor(headers);
  expect(actor.ok).toBe(true);
  expect(await getCurrentActor(headers)).toEqual(actor);
  expect(await getCurrentActor(new Headers())).toMatchObject({
    ok: false,
    error: { code: "UNAUTHENTICATED" },
  });
  await prisma.session.updateMany({
    where: { userId: user.id },
    data: { expiresAt: new Date(0) },
  });
  expect(await getCurrentActor(headers)).toMatchObject({
    ok: false,
    error: { code: "UNAUTHENTICATED" },
  });
});
