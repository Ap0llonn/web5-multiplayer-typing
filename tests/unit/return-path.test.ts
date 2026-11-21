import { expect, it } from "vitest";
import {
  readReturnPath,
  withReturnPath,
} from "@/shared/presentation/i18n/return-path";

it("keeps in-app paths with their query and drops the locale prefix", () => {
  expect(readReturnPath("/play/create")).toBe("/play/create");
  expect(readReturnPath("/play/player?code=ABC234")).toBe(
    "/play/player?code=ABC234",
  );
  expect(readReturnPath("/en/lobbies")).toBe("/lobbies");
  expect(readReturnPath("/fr")).toBe("/");
  expect(readReturnPath(["/lobbies", "/profile"])).toBe("/lobbies");
});

it("never keeps a fragment, where single-use invitation tokens live", () => {
  expect(readReturnPath("/play/player?code=ABC234#invite=secret")).toBe(
    "/play/player?code=ABC234",
  );
});

it("rejects external, ambiguous, auth and API destinations", () => {
  for (const value of [
    undefined,
    "",
    "play",
    "//evil.example",
    "/\\evil.example",
    "/%5Cevil.example",
    "https://evil.example/play",
    "javascript:alert(1)",
    "/play\nnext",
    "/login",
    "/en/signup?next=/play",
    "/api/lobbies",
    `/${"a".repeat(600)}`,
  ])
    expect(readReturnPath(value), String(value)).toBeNull();
});

it("builds auth links that carry only a safe return path", () => {
  expect(withReturnPath("/login", "/play/create")).toBe(
    "/login?next=%2Fplay%2Fcreate",
  );
  expect(withReturnPath("/signup", "/play/player?code=ABC234")).toBe(
    "/signup?next=%2Fplay%2Fplayer%3Fcode%3DABC234",
  );
  expect(withReturnPath("/login", "/")).toBe("/login");
  expect(withReturnPath("/login", null)).toBe("/login");
  expect(withReturnPath("/signup", "//evil.example")).toBe("/signup");
});
