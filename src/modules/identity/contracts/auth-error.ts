import type { ErrorCode } from "@/shared/contracts/operation-result";
export function mapAuthError(code: string | undefined): `errors.${ErrorCode}` {
  if (
    code?.includes("ALREADY_EXISTS") ||
    code?.includes("USERNAME_IS_ALREADY_TAKEN")
  )
    return "errors.CONFLICT";
  if (
    code?.includes("INVALID_USERNAME_OR_PASSWORD") ||
    code?.includes("INVALID_EMAIL_OR_PASSWORD")
  )
    return "errors.UNAUTHENTICATED";
  if (code?.includes("RATE_LIMIT") || code === "TOO_MANY_REQUESTS")
    return "errors.RATE_LIMITED";
  if (
    code?.includes("INVALID") ||
    code?.includes("TOO_SHORT") ||
    code?.includes("TOO_LONG")
  )
    return "errors.VALIDATION";
  return "errors.INTERNAL";
}
