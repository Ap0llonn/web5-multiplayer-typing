import type { createAuthentication } from "@/shared/infrastructure/auth/config";
export function testRequest(
  auth: ReturnType<typeof createAuthentication>,
  path: string,
  body?: object,
  cookie?: string,
  ip?: string,
) {
  return auth.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        ...(cookie ? { cookie } : {}),
        ...(ip ? { "x-forwarded-for": ip } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
}
export async function signup(
  auth: ReturnType<typeof createAuthentication>,
  username: string,
) {
  const response = await testRequest(
    auth,
    "/sign-up/email",
    {
      name: username,
      username,
      email: `${username}@example.com`,
      password: "test-password-123",
    },
    undefined,
    `192.0.2.${(Array.from(username).reduce((n, c) => n + c.charCodeAt(0), 0) % 250) + 1}`,
  );
  const data = await response.clone().json();
  if (!response.ok)
    throw new Error(
      `Test signup failed: ${response.status} ${String(data.code)}`,
    );
  return {
    response,
    cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
    user: data.user as { id: string },
  };
}
