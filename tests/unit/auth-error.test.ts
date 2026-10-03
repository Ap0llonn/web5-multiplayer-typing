import { expect, it } from "vitest";
import { mapAuthError } from "@/modules/identity/contracts/auth-error";
it("maps known errors and redacts unknown provider errors", () => {
  expect(mapAuthError("INVALID_USERNAME_OR_PASSWORD")).toEqual(
    "errors.UNAUTHENTICATED",
  );
  expect(mapAuthError("USER_ALREADY_EXISTS")).toEqual("errors.CONFLICT");
  expect(mapAuthError("password=private-value")).toEqual("errors.INTERNAL");
});
