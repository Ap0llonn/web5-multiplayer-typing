import "server-only";
import { getCurrentActor } from "@/modules/identity/server";
import {
  getRaceService,
  raceSettingsSchema,
  raceEditSchema,
  raceUseItemSchema,
  emptyRaceCommandSchema,
  roomCodeSchema,
} from "@/modules/lobby/server";
import { failure } from "@/shared/contracts/operation-result";
import { resultResponse } from "@/shared/infrastructure/http/response";
import { readServerEnv } from "@/shared/infrastructure/env/server";

export async function handleRaceCommand(
  request: Request,
  code: string,
  command: string,
) {
  try {
    if (request.headers.get("origin") !== readServerEnv(process.env).authUrl)
      return resultResponse(failure("FORBIDDEN"));
    const parsedCode = roomCodeSchema.safeParse(code);
    if (!parsedCode.success || new URL(request.url).search)
      return resultResponse(failure("VALIDATION"));
    const actor = await getCurrentActor(request.headers);
    if (!actor.ok) return resultResponse(actor);
    if (
      !request.body ||
      Number(request.headers.get("content-length") ?? 0) > 8192
    )
      return resultResponse(failure("VALIDATION"));
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) {
        await reader.cancel();
        return resultResponse(failure("VALIDATION"));
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let input: unknown;
    try {
      input = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return resultResponse(failure("VALIDATION"));
    }
    const service = getRaceService();
    if (command === "configure") {
      const parsed = raceSettingsSchema.safeParse(input);
      return resultResponse(
        parsed.success
          ? await service.configure(parsedCode.data, actor.value, parsed.data)
          : failure("VALIDATION"),
      );
    }
    if (command === "progress") {
      const parsed = raceEditSchema.safeParse(input);
      return resultResponse(
        parsed.success
          ? await service.edit(parsedCode.data, actor.value, parsed.data)
          : failure("VALIDATION"),
      );
    }
    if (command === "item") {
      const parsed = raceUseItemSchema.safeParse(input);
      return resultResponse(
        parsed.success
          ? await service.useItem(parsedCode.data, actor.value, parsed.data)
          : failure("VALIDATION"),
      );
    }
    if (!emptyRaceCommandSchema.safeParse(input).success)
      return resultResponse(failure("VALIDATION"));
    if (command === "start")
      return resultResponse(await service.start(parsedCode.data, actor.value));
    if (command === "abandon")
      return resultResponse(
        await service.abandon(parsedCode.data, actor.value),
      );
    if (command === "replay" || command === "close")
      return resultResponse(
        await service.reset(parsedCode.data, actor.value, command === "close"),
      );
    return resultResponse(failure("NOT_FOUND"));
  } catch {
    return resultResponse(failure("INTERNAL"));
  }
}
