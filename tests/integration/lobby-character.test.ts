import { afterAll, expect, it } from "vitest";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { getCurrentActor } from "@/modules/identity/server";
import { getLobbyService } from "@/modules/lobby/server";
import { handleLobbyCommand } from "@/composition/lobby/http";
import { signup, testRequest } from "../support/auth";

afterAll(() => prisma.$disconnect());
it("persists real guest characters, shares changes, and refuses spoofed identities and invalid characters", async () => {
  const auth = createAuthentication();
  const owner = await signup(
    auth,
    `charhost${Date.now().toString().slice(-8)}`,
  );
  const guestResponse = await testRequest(auth, "/sign-in/anonymous", {
    name: "Character Guest",
  });
  expect(guestResponse.ok).toBe(true);
  const cookie = guestResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
  const host = await getCurrentActor(new Headers({ cookie: owner.cookie }));
  const guest = await getCurrentActor(new Headers({ cookie }));
  if (!host.ok || !guest.ok) throw new Error("Test sessions unavailable");
  const service = getLobbyService();
  const created = await service.createLobby(
    {
      name: "Live characters",
      capacity: 2,
      role: "PARTICIPANT",
      character: "butter",
    },
    host.value,
  );
  if (!created.ok) throw new Error(created.error.code);
  const code = created.value.code;
  const join = (body: object) =>
    handleLobbyCommand(
      new Request("http://localhost:3000/api/lobbies/join", {
        method: "POST",
        headers: {
          cookie,
          origin: "http://localhost:3000",
          "content-type": "application/json",
          "x-forwarded-for": "192.0.2.170",
        },
        body: JSON.stringify(body),
      }),
      "join",
    );
  expect(
    (await join({ code, role: "PARTICIPANT", character: "mint" })).status,
  ).toBe(200);
  expect(
    await prisma.lobbyMember.findUnique({
      where: { activePlayerIdentityId: guest.value.playerIdentityId },
    }),
  ).toMatchObject({ character: "mint" });
  expect(await service.observeLobby(code, host.value)).toMatchObject({
    ok: true,
    value: { members: [{ character: "butter" }, { character: "mint" }] },
  });
  await join({ code, role: "PARTICIPANT" });
  expect(await service.currentLobby(guest.value)).toMatchObject({
    ok: true,
    value: { members: [{ character: "butter" }, { character: "mint" }] },
  });
  const changed = await (
    await join({ code, role: "PARTICIPANT", character: "coral" })
  ).json();
  expect(changed).toMatchObject({
    ok: true,
    value: { members: [{ character: "butter" }, { character: "coral" }] },
  });
  expect(changed.value.version).toBeGreaterThan(created.value.version);
  expect(
    await prisma.lobbyMember.count({
      where: {
        lobbyId: created.value.id,
        activePlayerIdentityId: guest.value.playerIdentityId,
      },
    }),
  ).toBe(1);
  expect(
    (await join({ code, role: "PARTICIPANT", character: "purple" })).status,
  ).toBe(400);
  expect(
    (
      await join({
        code,
        role: "PARTICIPANT",
        character: "cobalt",
        playerIdentityId: host.value.playerIdentityId,
      })
    ).status,
  ).toBe(400);
  expect(await service.observeLobby(code, host.value)).toMatchObject({
    ok: true,
    value: { members: [{ character: "butter" }, { character: "coral" }] },
  });
  await expect(
    prisma.$executeRaw`UPDATE "LobbyMember" SET "character"='purple' WHERE "activePlayerIdentityId"=${guest.value.playerIdentityId}`,
  ).rejects.toThrow();
});
