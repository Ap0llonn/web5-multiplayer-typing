"use client";
import { useState, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/shared/presentation/i18n/navigation";
import { authClient, signInGuest } from "../infrastructure/auth-client";
import { mapAuthError } from "../contracts/auth-error";
export function AuthForm({
  mode,
  providers = [],
}: {
  mode: "login" | "signup" | "guest";
  providers?: string[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result =
        mode === "guest"
          ? await signInGuest(String(form.get("name")))
          : mode === "login"
            ? await authClient.signIn.username({
                username: String(form.get("username")),
                password: String(form.get("password")),
              })
            : await authClient.signUp.email({
                name: String(form.get("username")),
                username: String(form.get("username")),
                email: String(form.get("email")),
                password: String(form.get("password")),
              });
      if (result.error) {
        setError(
          mapAuthError(
            "code" in result.error && typeof result.error.code === "string"
              ? result.error.code
              : undefined,
          ),
        );
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("errors.INTERNAL");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <div className="grid gap-4">
      <form onSubmit={submit}>
        {mode === "guest" ? (
          <label>
            {t("guestName")}
            <input
              name="name"
              minLength={3}
              maxLength={20}
              autoComplete="nickname"
              required
            />
          </label>
        ) : (
          <>
            <label>
              {t("username")}
              <input
                name="username"
                minLength={3}
                maxLength={20}
                autoComplete="username"
                required
              />
            </label>
            {mode === "signup" && (
              <label>
                {t("email")}
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
            )}
            <label>
              {t("password")}
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
              />
            </label>
          </>
        )}
        {error && <p role="alert">{t(error)}</p>}
        <button disabled={pending}>
          {pending
            ? t("pending")
            : t(
                mode === "guest"
                  ? "guest"
                  : mode === "signup"
                    ? "signup"
                    : "login",
              )}
        </button>
        {mode === "signup" && <small>{t("noRecovery")}</small>}
      </form>
      {mode !== "guest" && (
        <div className="grid gap-2">
          {(["github", "discord"] as const).map((provider) => (
            <div key={provider}>
              <button
                disabled={!providers.includes(provider) || pending}
                onClick={async () => {
                  setPending(true);
                  try {
                    const result = await authClient.signIn.social({
                      provider,
                      callbackURL: `/${locale}`,
                    });
                    if (result.error)
                      setError(
                        mapAuthError(
                          "code" in result.error &&
                            typeof result.error.code === "string"
                            ? result.error.code
                            : undefined,
                        ),
                      );
                  } catch {
                    setError("errors.INTERNAL");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {t(provider)}
              </button>
              {!providers.includes(provider) && (
                <small className="block">{t("providerUnavailable")}</small>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
