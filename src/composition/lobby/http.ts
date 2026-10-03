import "server-only";
import { getCurrentActor } from "@/modules/identity/server";
import {
  getLobbyService,
  createLobbySchema,
  joinLobbySchema,
  roomCodeSchema,
} from "@/modules/lobby/server";
import { failure } from "@/shared/contracts/operation-result";
import { resultResponse } from "@/shared/infrastructure/http/response";
import { readServerEnv } from "@/shared/infrastructure/env/server";
import { allowRequest } from "@/shared/infrastructure/http/rate-limit";
export async function handleLobbyCommand(
  request: Request,
  operation: "create" | "join" | "leave" | "current",
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
    const service = getLobbyService();
    if (operation === "current")
      return resultResponse(await service.currentLobby(actor.value));
    if (operation === "leave") {
      const parsed = roomCodeSchema.safeParse(code);
      if (!parsed.success) return resultResponse(failure("VALIDATION"));
      return resultResponse(await service.leaveLobby(parsed.data, actor.value));
    }
    if (!(await allowRequest(operation, request.headers, 10)))
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
    if (operation === "create") {
      const parsed = createLobbySchema.safeParse(data);
      return resultResponse(
        parsed.success
          ? await service.createLobby(parsed.data, actor.value)
          : failure("VALIDATION"),
      );
    }
    const parsed = joinLobbySchema.safeParse(data);
    return resultResponse(
      parsed.success
        ? await service.joinLobby(
            parsed.data.code,
            parsed.data.role,
            actor.value,
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
  return getLobbyService().heartbeat(parsed.data, actor.value);
}
