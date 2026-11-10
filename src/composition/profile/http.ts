import "server-only";
import {
  getCurrentProfile,
  getCurrentProfilePhoto,
  updateCurrentProfile,
  profilePhotoQuerySchema,
} from "@/modules/identity/server";
import { failure } from "@/shared/contracts/operation-result";
import { readServerEnv } from "@/shared/infrastructure/env/server";
import { resultResponse } from "@/shared/infrastructure/http/response";
import { allowRequest } from "@/shared/infrastructure/http/rate-limit";

export async function handleProfileUpdate(request: Request) {
  try {
    if (request.headers.get("origin") !== readServerEnv(process.env).authUrl)
      return resultResponse(failure("FORBIDDEN"));
    const profile = await getCurrentProfile(request.headers);
    if (!profile.ok) return resultResponse(profile);
    if (!(await allowRequest("profile-update", request.headers, 10)))
      return resultResponse(failure("RATE_LIMITED"));
    // Bound the actual streamed body, including requests without Content-Length.
    const maxBodyBytes = 2 * 1024 * 1024 + 64 * 1024;
    if (
      Number(request.headers.get("content-length")) > maxBodyBytes ||
      !request.body
    )
      return resultResponse(failure("VALIDATION"));
    const reader = request.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > maxBodyBytes) {
          await reader.cancel();
          return resultResponse(failure("VALIDATION"));
        }
        chunks.push(new Uint8Array(chunk.value));
      }
    } finally {
      reader.releaseLock();
    }
    let form: FormData;
    try {
      form = await new Response(new Blob(chunks), {
        headers: { "content-type": request.headers.get("content-type") ?? "" },
      }).formData();
    } catch {
      return resultResponse(failure("VALIDATION"));
    }
    return resultResponse(await updateCurrentProfile(request.headers, form));
  } catch {
    return resultResponse(failure("INTERNAL"));
  }
}

export async function handleProfilePhoto(request: Request) {
  const query = new URL(request.url).searchParams;
  if (
    query.getAll("v").length > 1 ||
    !profilePhotoQuerySchema.safeParse(Object.fromEntries(query)).success
  )
    return resultResponse(failure("VALIDATION"));
  const result = await getCurrentProfilePhoto(request.headers);
  if (!result.ok) return resultResponse(result);
  return new Response(new Uint8Array(result.value), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function handlePlayerPhoto(request: Request) {
  const { z } = await import("zod");
  const { getCurrentActor } = await import("@/modules/identity/server");
  const { getLobbyService, readRaceArchive } =
    await import("@/modules/lobby/server");
  const parsed = z
    .object({
      player: z.string().min(1).max(128),
      race: z.string().min(1).max(100).optional(),
    })
    .strict()
    .safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return resultResponse(failure("VALIDATION"));
  const actor = await getCurrentActor(request.headers);
  if (!actor.ok) return resultResponse(actor);
  const room = await getLobbyService().currentLobby(actor.value);
  const archive = parsed.data.race
    ? await readRaceArchive(parsed.data.race, actor.value.playerIdentityId)
    : null;
  const archivedParticipant =
    archive?.ok &&
    archive.value.players.some(
      (player) => player.playerIdentityId === parsed.data.player,
    );
  if (
    !archivedParticipant &&
    parsed.data.player !== actor.value.playerIdentityId &&
    (!room.ok ||
      !room.value?.members.some(
        (member) => member.playerIdentityId === parsed.data.player,
      ))
  )
    return resultResponse(failure("NOT_FOUND"));
  const photo = await getCurrentProfilePhoto(
    request.headers,
    parsed.data.player,
  );
  if (!photo.ok) return resultResponse(photo);
  return new Response(new Uint8Array(photo.value), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
