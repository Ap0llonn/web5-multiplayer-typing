import "server-only";
import { getCurrentActor, getCurrentProfile } from "@/modules/identity/server";
import {
  getLobbyService,
  createLobbySchema,
  publicLobbiesQuerySchema,
  heartbeatLobbySchema,
  kickLobbySchema,
  joinLobbySchema,
  roomCodeSchema,
} from "@/modules/lobby/server";
import { failure, success } from "@/shared/contracts/operation-result";
import { resultResponse } from "@/shared/infrastructure/http/response";
import { readServerEnv } from "@/shared/infrastructure/env/server";
import { allowRequest } from "@/shared/infrastructure/http/rate-limit";
export async function handleLobbyCommand(
  request: Request,
  operation: "create" | "join" | "leave" | "current" | "heartbeat" | "kick",
  code?: string,
) {
  try {
    if (
      operation !== "current" &&
      request.headers.get("origin") !== readServerEnv(process.env).authUrl
    )
      return resultResponse(failure("FORBIDDEN"));
    const actor = await getCurrentActor(request.headers);
    if (!actor.ok) return resultResponse(actor);
    const profile =
      operation === "create" || operation === "join"
        ? await getCurrentProfile(request.headers)
        : null;
    const lobbyActor = {
      ...actor.value,
      hasProfilePhoto: !!(profile?.ok && profile.value.photoVersion !== null),
    };
    const service = getLobbyService();
    if (operation === "current")
      return resultResponse(await service.currentLobby(actor.value));
    if (operation === "leave") {
      const parsed = roomCodeSchema.safeParse(code);
      if (!parsed.success) return resultResponse(failure("VALIDATION"));
      return resultResponse(await service.leaveLobby(parsed.data, actor.value));
    }
    if (
      (operation === "create" || operation === "join") &&
      !(await allowRequest(operation, request.headers, 10))
    )
      return resultResponse(failure("RATE_LIMITED"));
    if (Number(request.headers.get("content-length") ?? 0) > 4096)
      return resultResponse(failure("VALIDATION"));
    const raw = await request.text();
    if (raw.length > 4096) return resultResponse(failure("VALIDATION"));
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return resultResponse(failure("VALIDATION"));
    }
    if (operation === "heartbeat") {
      const parsed = roomCodeSchema.safeParse(code);
      return resultResponse(
        parsed.success && heartbeatLobbySchema.safeParse(data).success
          ? await service.heartbeat(parsed.data, actor.value)
          : failure("VALIDATION"),
      );
    }
    if (operation === "create") {
      const parsed = createLobbySchema.safeParse(data);
      return resultResponse(
        parsed.success
          ? await service.createLobby(parsed.data, lobbyActor)
          : failure("VALIDATION"),
      );
    }
    if (operation === "kick") {
      const parsedCode = roomCodeSchema.safeParse(code);
      const parsedBody = kickLobbySchema.safeParse(data);
      return resultResponse(
        parsedCode.success && parsedBody.success
          ? await service.kickLobby(
              parsedCode.data,
              parsedBody.data.playerIdentityId,
              actor.value,
            )
          : failure("VALIDATION"),
      );
    }
    const parsed = joinLobbySchema.safeParse(data);
    return resultResponse(
      parsed.success
        ? await service.joinLobby(
            parsed.data.code,
            parsed.data.role,
            lobbyActor,
            parsed.data.character,
          )
        : failure("VALIDATION"),
    );
  } catch {
    return resultResponse(failure("INTERNAL"));
  }
}
export async function getRoomSnapshot(headers: Headers, code: string) {
  const parsed = roomCodeSchema.safeParse(code);
  if (!parsed.success) return failure("VALIDATION");
  const actor = await getCurrentActor(headers);
  if (!actor.ok) return actor;
  return getLobbyService().observeLobby(parsed.data, actor.value);
}

// Browsing publishes only the public summary; membership/session checks remain on join.
export async function getPublicLobbies() {
  try {
    return await getLobbyService().listPublicLobbies();
  } catch {
    return failure("INTERNAL");
  }
}
export async function handlePublicLobbies(request: Request) {
  const parsed = publicLobbiesQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  return resultResponse(
    parsed.success ? await getPublicLobbies() : failure("VALIDATION"),
  );
}

export async function handleQuickLobby(request: Request) {
  try {
    const parsed = publicLobbiesQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) return resultResponse(failure("VALIDATION"));
    const actor = await getCurrentActor(request.headers);
    if (!actor.ok && actor.error.code !== "UNAUTHENTICATED")
      return resultResponse(actor);
    const result = await getLobbyService().findQuickLobby(
      actor.ok ? actor.value.playerIdentityId : undefined,
    );
    return resultResponse(
      result.ok
        ? success({
            room: result.value,
            canCreate: actor.ok && actor.value.kind === "account",
          })
        : result,
    );
  } catch {
    return resultResponse(failure("INTERNAL"));
  }
}
