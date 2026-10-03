import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { AuthForm } from "@/modules/identity/presentation/auth-form";
import { SignOutButton } from "@/modules/identity/presentation/sign-out-button";
import { readServerEnv } from "@/shared/infrastructure/env/server";
export async function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const t = await getTranslations();
  const actor = await getCurrentActor(await headers());
  return (
    <div className="mx-auto max-w-md">
      <h1>{t(mode)}</h1>
      {actor.ok ? (
        <section>
          <p>{t("guestWarning")}</p>
          <SignOutButton />
        </section>
      ) : (
        <AuthForm
          mode={mode}
          providers={Object.keys(readServerEnv(process.env).providers)}
        />
      )}
    </div>
  );
}
