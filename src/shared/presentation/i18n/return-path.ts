import { routing } from "./routing";

const MAX_RETURN_PATH_LENGTH = 512;
const BASE = "http://return-path.invalid";
const EXCLUDED = ["/login", "/signup", "/api"];

function stripLocale(pathname: string) {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`))
      return pathname.slice(locale.length + 1);
  }
  return pathname;
}

/**
 * Accepts only a same-origin, locale-free app path (with query, without
 * fragment). Anything else — external, protocol-relative, backslash, control
 * characters, auth or API routes — is refused so a `next` link cannot become
 * an open redirect or a login loop.
 */
export function readReturnPath(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || raw.length > MAX_RETURN_PATH_LENGTH)
    return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(raw) || /%5c/i.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  const pathname = stripLocale(url.pathname);
  if (
    EXCLUDED.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  )
    return null;
  return pathname + url.search;
}

export function withReturnPath(
  href: "/login" | "/signup",
  next: string | null | undefined,
) {
  const safe = readReturnPath(next);
  return safe && safe !== "/"
    ? `${href}?${new URLSearchParams({ next: safe })}`
    : href;
}
