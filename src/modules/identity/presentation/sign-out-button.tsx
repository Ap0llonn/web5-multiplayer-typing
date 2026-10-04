"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/shared/presentation/i18n/navigation";
import { authClient } from "../infrastructure/auth-client";
import { Button } from "@/shared/presentation/ui/button";
export function SignOutButton() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function signOut() {
    setPending(true);
    try {
      const r = await authClient.signOut();
      if (r.error) setError(true);
      else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <Button variant="paper" size="small" disabled={pending} onClick={signOut}>
        {t("logout")}
      </Button>
      {error && <p role="alert">{t("errors.INTERNAL")}</p>}
    </div>
  );
}
