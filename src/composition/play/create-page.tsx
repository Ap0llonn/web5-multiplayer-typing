import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { CreateRoomPanel } from "@/modules/lobby/presentation/entry/create-room-panel";
import { Link } from "@/shared/presentation/i18n/navigation";
import { buttonStyles } from "@/shared/presentation/ui/button";

export async function CreatePage() {
  const t = await getTranslations();
  const actor = await getCurrentActor(await headers());
  return (
    <section
      className="mx-auto grid w-full max-w-2xl gap-6 py-8"
      aria-labelledby="create-title"
    >
      <div>
        <p className="section-eyebrow">{t("hostBadge")}</p>
        <h1 id="create-title" className="text-3xl font-extrabold">
          {t("play.createTitle")}
        </h1>
      </div>
      {actor.ok && actor.value.kind === "account" ? (
        <CreateRoomPanel />
      ) : !actor.ok && actor.error.code !== "UNAUTHENTICATED" ? (
        <p role="alert">{t(actor.error.messageKey)}</p>
      ) : (
        <div className="grid gap-4 rounded-3xl border-2 border-[var(--border)] bg-[var(--panel)] p-6">
          <p>{t(actor.ok ? "guestLimit" : "accountRequired")}</p>
          <Link href="/login" className={buttonStyles({ variant: "ink" })}>
            {t("login")}
          </Link>
          <Link href="/signup" className={buttonStyles({ variant: "paper" })}>
            {t("signup")}
          </Link>
        </div>
      )}
      <Link href="/" className="font-bold underline underline-offset-4">
        {t("home")}
      </Link>
    </section>
  );
}
