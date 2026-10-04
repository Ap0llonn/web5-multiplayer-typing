"use client";
import { useState, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/shared/presentation/i18n/navigation";
import { authClient, signInGuest } from "../infrastructure/auth-client";
import { mapAuthError } from "../contracts/auth-error";
import { Button } from "@/shared/presentation/ui/button";
import { Field, Input } from "@/shared/presentation/ui/field";
import { Icon } from "@/shared/presentation/ui/icon";
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
      <form onSubmit={submit} className="grid gap-5">
        {mode === "guest" ? (
          <Field label={t("guestName")}>
            <Input
              name="name"
              minLength={3}
              maxLength={20}
              autoComplete="nickname"
              placeholder={t("guestPlaceholder")}
              required
            />
          </Field>
        ) : (
          <>
            <Field label={t("username")}>
              <Input
                name="username"
                minLength={3}
                maxLength={20}
                autoComplete="username"
                required
              />
            </Field>
            {mode === "signup" && (
              <Field label={t("email")}>
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </Field>
            )}
            <Field label={t("password")}>
              <Input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
              />
            </Field>
          </>
        )}
        {error && <p role="alert">{t(error)}</p>}
        <Button
          type="submit"
          variant={mode === "guest" ? "pink" : "ink"}
          disabled={pending}
          className="w-full"
        >
          {pending
            ? t("pending")
            : t(
                mode === "guest"
                  ? "guest"
                  : mode === "signup"
                    ? "signup"
                    : "login",
              )}
          <Icon name="arrow" />
        </Button>
        {mode === "signup" && <small>{t("noRecovery")}</small>}
      </form>
      {mode !== "guest" && (
        <div className="grid gap-4">
          <div className="auth-divider">
            <span>{t("or")}</span>
          </div>
          {(["github", "discord"] as const).map((provider) => (
            <div key={provider}>
              <Button
                variant="paper"
                className="w-full"
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
              </Button>
              {!providers.includes(provider) && (
                <small className="mt-2 block text-center">
                  {t("providerUnavailable")}
                </small>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
