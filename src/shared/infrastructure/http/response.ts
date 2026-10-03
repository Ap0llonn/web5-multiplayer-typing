import "server-only";
import type {
  OperationResult,
  ErrorCode,
} from "@/shared/contracts/operation-result";
const statuses: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  NOT_FOUND: 404,
  ROOM_FULL: 409,
  ROOM_CLOSED: 410,
  RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 503,
  INTERNAL: 500,
};
export const resultResponse = <T>(result: OperationResult<T>) =>
  Response.json(result, {
    status: result.ok ? 200 : statuses[result.error.code],
    headers: { "cache-control": "no-store" },
  });
