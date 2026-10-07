import { expect, it, vi } from "vitest";
import { success, failure } from "@/shared/contracts/operation-result";
import {
  profileNameSchema,
  profilePhotoQuerySchema,
} from "@/modules/identity/contracts/profile";
import { DefaultProfileSupervisor } from "@/modules/identity/supervisors/implementations/default-profile-supervisor";
import type { ProfileRepository } from "@/modules/identity/repositories/interfaces/profile-repository";

const profile = {
  displayName: "Player",
  username: "player",
  joinedAt: 0,
  photoVersion: null,
};
function setup() {
  const repository: ProfileRepository = {
    read: vi.fn(async () => success(profile)),
    update: vi.fn(async () => success(profile)),
    readPhoto: vi.fn(async () => failure("NOT_FOUND")),
  };
  return { repository, service: new DefaultProfileSupervisor(repository) };
}
const principal = {
  authUserId: "session-user",
  kind: "account",
  displayName: "Player",
} as const;

it("validates trimmed display names at 3 and 20 characters", () => {
  for (const name of ["ab", "x".repeat(21), "   ", "abc\n"]) {
    expect(profileNameSchema.safeParse({ displayName: name }).success).toBe(
      false,
    );
  }
  expect(profileNameSchema.parse({ displayName: " abc " }).displayName).toBe(
    "abc",
  );
  expect(
    profileNameSchema.safeParse({ displayName: "x".repeat(20) }).success,
  ).toBe(true);
  expect(
    profileNameSchema.safeParse({ displayName: "Player", userId: "other" })
      .success,
  ).toBe(false);
});

it("accepts only a numeric photo version query", () => {
  expect(profilePhotoQuerySchema.parse({ v: "123" })).toEqual({ v: 123 });
  expect(profilePhotoQuerySchema.parse({})).toEqual({});
  for (const query of [
    { v: "bad" },
    { v: "-1" },
    { v: "1.5" },
    { userId: "other" },
  ]) {
    expect(profilePhotoQuerySchema.safeParse(query).success).toBe(false);
  }
});

it("refuses absent and guest sessions for every profile operation before persistence", async () => {
  for (const actor of [null, { ...principal, kind: "guest" as const }]) {
    const { repository, service } = setup();
    const code = actor ? "FORBIDDEN" : "UNAUTHENTICATED";
    expect(await service.currentProfile(actor)).toEqual(failure(code));
    expect(
      await service.updateProfile(actor, { displayName: "Updated" }),
    ).toEqual(failure(code));
    expect(await service.currentPhoto(actor)).toEqual(failure(code));
    expect(repository.read).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.readPhoto).not.toHaveBeenCalled();
  }
});

it("updates only the session user and propagates persistence failures", async () => {
  const { repository, service } = setup();
  expect(
    await service.updateProfile(principal, { displayName: " Updated " }),
  ).toEqual(success(profile));
  expect(repository.update).toHaveBeenCalledWith("session-user", {
    displayName: "Updated",
  });
  vi.mocked(repository.update).mockResolvedValueOnce(failure("INTERNAL"));
  expect(
    await service.updateProfile(principal, { displayName: "Updated" }),
  ).toEqual(failure("INTERNAL"));
  expect(await service.updateProfile(principal, { displayName: "x" })).toEqual(
    failure("VALIDATION"),
  );
  expect(repository.update).toHaveBeenCalledTimes(2);
});
