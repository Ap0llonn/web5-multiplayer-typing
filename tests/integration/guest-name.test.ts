import { expect, it } from "vitest";
import { createAuthentication } from "@/shared/infrastructure/auth/config";
import { testRequest } from "../support/auth";
it("requires a guest-selected name between 3 and 20 characters", async () => {
  const auth = createAuthentication();
  expect(
    (await testRequest(auth, "/sign-in/anonymous", { name: "ab" })).status,
  ).toBe(400);
  expect((await testRequest(auth, "/sign-in/anonymous", {})).status).toBe(400);
  const response = await testRequest(auth, "/sign-in/anonymous", {
    name: "Invité Test",
  });
  expect(response.status).toBe(200);
  expect((await response.json()).user.name).toBe("Invité Test");
});
