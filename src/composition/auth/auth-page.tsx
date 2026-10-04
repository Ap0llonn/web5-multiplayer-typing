import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { AuthForm } from "@/modules/identity/presentation/auth-form";
import { SignOutButton } from "@/modules/identity/presentation/sign-out-button";
import { readServerEnv } from "@/shared/infrastructure/env/server";
import { AuthLayout } from "@/shared/presentation/ui/auth-layout";
import { Link } from "@/shared/presentation/i18n/navigation";
export async function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const t = await getTranslations();
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
          href={mode === "login" ? "/signup" : "/login"}
          className="underline underline-offset-4"
        >
          {t(mode === "login" ? "signupPrompt" : "loginPrompt")}
        </Link>
      }
    >
      {actor.ok ? (
        <div>
          <p>{t("guestWarning")}</p>
          <SignOutButton />
        </div>
      ) : actor.error.code !== "UNAUTHENTICATED" ? (
        <p role="alert">{t(actor.error.messageKey)}</p>
      ) : (
        <AuthForm
          mode={mode}
          providers={Object.keys(readServerEnv(process.env).providers)}
        />
      )}
    </AuthLayout>
  );
}
