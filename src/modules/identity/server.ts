import "server-only";
import { failure } from "@/shared/contracts/operation-result";
import { identitySupervisor, profileSupervisor } from "./container";
import { profileNameSchema } from "./contracts/profile";
import { resizeProfilePhoto } from "./infrastructure/profile-photo";
import { readSession } from "./infrastructure/session-reader";
import { ServerConfigurationError } from "@/shared/infrastructure/env/server";
export { profilePhotoQuerySchema } from "./contracts/profile";
export async function getCurrentActor(headers: Headers) {
  try {
    return await identitySupervisor.resolveActor(await readSession(headers));
  } catch (error) {
    if (error instanceof ServerConfigurationError) console.error(error.message);
    return failure("INTERNAL");
  }
}

export async function getCurrentProfile(headers: Headers) {
  try {
    return await profileSupervisor.currentProfile(await readSession(headers));
  } catch {
    return failure("INTERNAL");
  }
}

export async function updateCurrentProfile(headers: Headers, form: FormData) {
  try {
    const principal = await readSession(headers);
    if (!principal) return failure("UNAUTHENTICATED");
    if (principal.kind !== "account") return failure("FORBIDDEN");
    // Exactly one name and at most one file; client-supplied identities are rejected.
    const entries = Array.from(form.entries());
    if (
      entries.some(([key]) => key !== "displayName" && key !== "photo") ||
      form.getAll("displayName").length !== 1 ||
      form.getAll("photo").length > 1
    )
      return failure("VALIDATION");
    const parsed = profileNameSchema.safeParse({
      displayName: form.get("displayName"),
    });
    if (!parsed.success) return failure("VALIDATION");
    const file = form.get("photo");
    if (file !== null && !(file instanceof File)) return failure("VALIDATION");
    if (file instanceof File) {
      const photo = await resizeProfilePhoto(file);
      if (!photo.ok) return photo;
      return await profileSupervisor.updateProfile(principal, {
        ...parsed.data,
        photo: photo.value,
      });
    }
    return await profileSupervisor.updateProfile(principal, parsed.data);
  } catch {
    return failure("INTERNAL");
  }
}

export async function getCurrentProfilePhoto(headers: Headers) {
  try {
    return await profileSupervisor.currentPhoto(await readSession(headers));
  } catch {
    return failure("INTERNAL");
  }
}
