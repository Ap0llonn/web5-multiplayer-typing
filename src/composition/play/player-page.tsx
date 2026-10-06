import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { getLobbyService, roomCodeSchema } from "@/modules/lobby/server";
import { redirect } from "@/shared/presentation/i18n/navigation";
import { JoinPlayerForm } from "./join-player-form";

export async function PlayerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const parsed = roomCodeSchema.safeParse((await searchParams).code);
  if (!parsed.success)
    return redirect({ href: "/play", locale: await getLocale() });
  const actor = await getCurrentActor(await headers());
  const t = await getTranslations();
  if (!actor.ok && actor.error.code !== "UNAUTHENTICATED")
    return <p role="alert">{t(actor.error.messageKey)}</p>;
  let member;
  if (actor.ok) {
    const current = await getLobbyService().currentLobby(actor.value);
    if (!current.ok) return <p role="alert">{t(current.error.messageKey)}</p>;
    if (current.value?.code === parsed.data)
      member = current.value.members.find(
        (player) => player.playerIdentityId === actor.value.playerIdentityId,
      );
  }
  return (
    <JoinPlayerForm
      code={parsed.data}
      actor={actor.ok ? actor.value : null}
      initialCharacter={member?.character}
      alreadyJoined={member !== undefined}
    />
  );
}
