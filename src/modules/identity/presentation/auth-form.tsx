"use client";
import { useState, useRef, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/shared/presentation/i18n/navigation";
import { authClient, signInGuest } from "../infrastructure/auth-client";
import { mapAuthError } from "../contracts/auth-error";
import { Button } from "@/shared/presentation/ui/button";
import { Icon } from "@/shared/presentation/ui/icon";
import { CredentialFields, GuestNameField } from "./auth-fields";
import {
  SocialSignInButtons,
  type SocialProvider,
} from "./social-sign-in-buttons";
export function AuthForm({
  mode,
  providers = [],
  onAuthenticated,
  children,
}: {
  mode: "login" | "signup" | "guest";
  providers?: string[];
  onAuthenticated?: () => Promise<void>;
  children?: ReactNode;
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
      if (onAuthenticated) {
        await onAuthenticated();
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

  async function signInSocial(provider: SocialProvider) {
    setPending(true);
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: `/${locale}`,
      });
      if (result.error)
        setError(
          mapAuthError(
            "code" in result.error && typeof result.error.code === "string"
              ? result.error.code
              : undefined,
          ),
        );
    } catch {
      setError("errors.INTERNAL");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={submit} className="grid gap-5">
        <fieldset className="contents" disabled={pending}>
          {mode === "guest" ? (
            <GuestNameField />
          ) : (
            <CredentialFields mode={mode} />
          )}
          {children}
        </fieldset>
        {error && <p role="alert">{t(error)}</p>}
        <Button
          type="submit"
          variant={mode === "guest" ? "blue" : "ink"}
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
        <SocialSignInButtons
          providers={providers}
          pending={pending}
          onSignIn={signInSocial}
        />
      )}
    </div>
  );
}
