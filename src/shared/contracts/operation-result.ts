export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "NOT_FOUND"
  | "ROOM_FULL"
  | "ROOM_CLOSED"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "INTERNAL";
export type OperationResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: { code: ErrorCode; messageKey: `errors.${ErrorCode}` };
    };
export const success = <T>(value: T): OperationResult<T> => ({
  ok: true,
  value,
});
export const failure = (code: ErrorCode): OperationResult<never> => ({
  ok: false,
  error: { code, messageKey: `errors.${code}` },
});
