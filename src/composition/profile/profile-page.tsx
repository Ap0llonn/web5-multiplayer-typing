import { ProfileHistory } from "@/modules/lobby/presentation/race/profile-history";
import { headers } from "next/headers";
import { getFormatter, getTranslations } from "next-intl/server";
import { readProfileMetrics } from "@/modules/lobby/server";
import { getCurrentActor, getCurrentProfile } from "@/modules/identity/server";
import { ProfileEditModal } from "@/modules/identity/presentation/profile/profile-edit-modal";
import { ProfileAvatar } from "@/modules/identity/presentation/profile/profile-avatar";
import { ProfileStatistics } from "@/modules/identity/presentation/profile/profile-statistics";
import { Link } from "@/shared/presentation/i18n/navigation";
import { Card } from "@/shared/presentation/ui/card";
import { Badge } from "@/shared/presentation/ui/badge";
import { buttonStyles } from "@/shared/presentation/ui/button";
import { Icon } from "@/shared/presentation/ui/icon";

export async function ProfilePage() {
  const t = await getTranslations();
  const result = await getCurrentProfile(await headers());
  if (!result.ok) {
    const restricted =
      result.error.code === "UNAUTHENTICATED" ||
      result.error.code === "FORBIDDEN";
    return (
      <Card className="mx-auto my-8 max-w-lg">
        <h1 className="text-3xl font-black">{t("profile.title")}</h1>
        {restricted ? (
          <>
            <p className="mt-4 text-muted">
              {t(
                result.error.code === "FORBIDDEN"
                  ? "profile.guestNotice"
                  : "profile.signInNotice",
              )}
            </p>
            <Link
              href={result.error.code === "FORBIDDEN" ? "/signup" : "/login"}
              className={buttonStyles({ variant: "blue", className: "mt-6" })}
            >
              {t(result.error.code === "FORBIDDEN" ? "signup" : "login")}
              <Icon name="arrow" />
            </Link>
          </>
        ) : (
          <p role="alert" className="mt-4">
            {t(result.error.messageKey)}
          </p>
        )}
      </Card>
    );
  }
  const actor = await getCurrentActor(await headers());
  const metrics =
    actor.ok && actor.value.kind === "account"
      ? await readProfileMetrics(actor.value.playerIdentityId)
      : null;
  const profile = result.value;
  const format = await getFormatter();
  return (
    <div className="mx-auto grid w-full gap-8 py-4 sm:py-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-[var(--accent)]">
            {t("profile.eyebrow")}
          </p>
          <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">
            {t("profile.title")}
          </h1>
        </div>
        <Link
          href="/play"
          className={buttonStyles({ variant: "paper", size: "small" })}
        >
          {t("play.navigationLabel")}
          <Icon name="arrow" />
        </Link>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="grid min-w-0 gap-6">
          <Card aria-labelledby="profile-player-name">
            <div className="flex flex-wrap items-center gap-5">
              <ProfileAvatar
                displayName={profile.displayName}
                photoVersion={profile.photoVersion}
              />
              <div className="min-w-0 flex-1 basis-36">
                <Badge tone="blue">{t("memberKind.account")}</Badge>
                <h2
                  id="profile-player-name"
                  className="mt-3 text-2xl font-black"
                >
                  {profile.displayName}
                </h2>
                {profile.username && (
                  <p className="break-all text-sm text-muted">
                    @{profile.username}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-5 text-sm text-muted">
              {t("profile.memberSince", {
                date: format.dateTime(profile.joinedAt, {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }),
              })}
            </p>
          </Card>
          <ProfileEditModal profile={profile} />
        </div>
        <div className="grid min-w-0 gap-6">
          {await ProfileStatistics({
            metrics: metrics?.ok ? metrics.value : null,
          })}
        </div>
      </div>
      {metrics?.ok && <ProfileHistory rows={metrics.value.history} />}
    </div>
  );
}
