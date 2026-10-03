import { expect, it } from "vitest";
import { DefaultIdentitySupervisor } from "@/modules/identity/supervisors/implementations/default-identity-supervisor";
it("rejects absent session before accessing persistence", async () => {
  const s = new DefaultIdentitySupervisor({
    ensureForAuthUser: async () => {
      throw Error("should not run");
    },
  });
  expect(await s.resolveActor(null)).toMatchObject({
    ok: false,
    error: { code: "UNAUTHENTICATED" },
  });
});
it.each(["guest", "account"] as const)(
  "resolves a stable %s actor",
  async (kind) => {
    const s = new DefaultIdentitySupervisor({
      ensureForAuthUser: async () => ({ ok: true, value: { id: "player" } }),
    });
    expect(
      await s.resolveActor({
        authUserId: "server-user",
        kind,
        displayName: "Player",
      }),
    ).toEqual({
      ok: true,
      value: { playerIdentityId: "player", kind, displayName: "Player" },
    });
  },
);
it("preserves safe persistence failures", async () => {
  const s = new DefaultIdentitySupervisor({
    ensureForAuthUser: async () => ({
      ok: false,
      error: { code: "INTERNAL", messageKey: "errors.INTERNAL" },
    }),
  });
  expect(
    await s.resolveActor({
      authUserId: "x",
      kind: "guest",
      displayName: "Guest",
    }),
  ).toEqual({
    ok: false,
    error: { code: "INTERNAL", messageKey: "errors.INTERNAL" },
  });
});
