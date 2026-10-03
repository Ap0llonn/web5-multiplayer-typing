import "server-only";
import { failure } from "@/shared/contracts/operation-result";
import { identitySupervisor } from "./container";
import { readSession } from "./infrastructure/session-reader";
export async function getCurrentActor(headers: Headers) {
  try {
    return await identitySupervisor.resolveActor(await readSession(headers));
  } catch {
    return failure("INTERNAL");
  }
}
