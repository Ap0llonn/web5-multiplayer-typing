import { it, expect } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { getCurrentActor } from "@/modules/identity/server";
import { DefaultLobbySupervisor } from "@/modules/lobby/supervisors/implementations/default-lobby-supervisor";
import { PrismaLobbyRepository } from "@/modules/lobby/repositories/implementations/prisma-lobby-repository";
import { signup } from "../support/auth";
it("expires a room on current-room lookup so the player can create another", async () => {
  const { cookie } = await signup(
    createAuthentication(),
    `expire${Date.now().toString().slice(-8)}`,
  );
  const actor = await getCurrentActor(new Headers({ cookie }));
  if (!actor.ok) throw Error();
  let now = 0;
  const service = new DefaultLobbySupervisor(
    new PrismaLobbyRepository(prisma),
    () => now,
  );
  expect(
    (
      await service.createLobby(
        { name: "Old", capacity: 2, role: "PARTICIPANT" },
        actor.value,
      )
    ).ok,
  ).toBe(true);
  now = 31000;
  expect(await service.currentLobby(actor.value)).toEqual({
    ok: true,
    value: null,
  });
  expect(
    (
      await service.createLobby(
        { name: "New", capacity: 2, role: "PARTICIPANT" },
        actor.value,
      )
    ).ok,
  ).toBe(true);
});
