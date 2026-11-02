import { expect, it } from "vitest";
import { createTranslator } from "next-intl";
import { mapAuthError } from "@/modules/identity/contracts/auth-error";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

it("distinguishes an existing email from an existing username", () => {
  expect(mapAuthError("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")).toBe(
    "authErrors.emailTaken",
  );
  expect(mapAuthError("USER_ALREADY_EXISTS")).toBe("authErrors.emailTaken");
  expect(mapAuthError("USERNAME_IS_ALREADY_TAKEN")).toBe(
    "authErrors.usernameTaken",
  );
});
for (const [locale, messages] of [
  ["en", en],
  ["fr", fr],
] as const) {
  it(`${locale}: duplicate signup feedback describes the actual field conflict`, () => {
    const t = createTranslator({ locale, messages });
    expect(t(mapAuthError("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"))).toContain(
      locale === "en"
        ? "email is already registered"
        : "adresse email est déjà utilisée",
    );
    expect(t(mapAuthError("USERNAME_IS_ALREADY_TAKEN"))).toContain(
      locale === "en"
        ? "username is already taken"
        : "identifiant est déjà pris",
    );
  });
}
it("maps known errors and redacts unknown provider errors", () => {
  expect(mapAuthError("INVALID_USERNAME_OR_PASSWORD")).toEqual(
    "errors.UNAUTHENTICATED",
  );
  expect(mapAuthError("TOO_MANY_REQUESTS")).toEqual("errors.RATE_LIMITED");
  expect(mapAuthError("password=private-value")).toEqual("errors.INTERNAL");
  expect(mapAuthError(undefined)).toEqual("errors.INTERNAL");
});
