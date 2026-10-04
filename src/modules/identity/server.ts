import "server-only";
import { failure } from "@/shared/contracts/operation-result";
import { identitySupervisor } from "./container";
import { readSession } from "./infrastructure/session-reader";
import { ServerConfigurationError } from "@/shared/infrastructure/env/server";
export async function getCurrentActor(headers: Headers) {
  try {
    return await identitySupervisor.resolveActor(await readSession(headers));
  } catch (error) {
    if (error instanceof ServerConfigurationError) console.error(error.message);
    return failure("INTERNAL");
  }
}
