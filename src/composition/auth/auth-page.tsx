import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { AuthForm } from "@/modules/identity/presentation/auth-form";
import { SignOutButton } from "@/modules/identity/presentation/sign-out-button";
import { readServerEnv } from "@/shared/infrastructure/env/server";
import { AuthLayout } from "@/shared/presentation/ui/auth-layout";
import { Link } from "@/shared/presentation/i18n/navigation";
import {
  readReturnPath,
  withReturnPath,
} from "@/shared/presentation/i18n/return-path";
export async function AuthPage({
  mode,
  searchParams,
}: {
  mode: "login" | "signup";
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const t = await getTranslations();
  // Validated server-side; the form only ever receives a safe in-app path.
  const returnTo = readReturnPath((await searchParams)?.next) ?? "/";
  const actor = await getCurrentActor(await headers());
  return (
    <AuthLayout
      title={t(mode)}
      description={t(
        mode === "login" ? "loginDescription" : "signupDescription",
      )}
      badge={t("authBadge")}
      footer={
        <Link
          href={withReturnPath(
            mode === "login" ? "/signup" : "/login",
            returnTo,
          )}
          className="underline underline-offset-4"
        >
          {t(mode === "login" ? "signupPrompt" : "loginPrompt")}
        </Link>
      }
    >
      {actor.ok && !(actor.value.kind === "guest" && mode === "signup") ? (
        <div>
          <p>{t("guestWarning")}</p>
          <SignOutButton />
        </div>
      ) : !actor.ok && actor.error.code !== "UNAUTHENTICATED" ? (
        <p role="alert">{t(actor.error.messageKey)}</p>
      ) : (
        <AuthForm
          mode={mode}
          returnTo={returnTo}
          providers={Object.keys(readServerEnv(process.env).providers)}
        />
      )}
    </AuthLayout>
  );
}
