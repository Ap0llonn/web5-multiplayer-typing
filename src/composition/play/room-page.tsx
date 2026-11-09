import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentActor } from "@/modules/identity/server";
import { LobbyRoom } from "@/modules/lobby/presentation/room/lobby-room";
import { redirect } from "@/shared/presentation/i18n/navigation";

async function renderRoom(configuration: boolean) {
  const actor = await getCurrentActor(await headers());
  const t = await getTranslations();
  if (!actor.ok) {
    if (actor.error.code === "UNAUTHENTICATED")
      redirect({ href: "/play", locale: await getLocale() });
    return <p role="alert">{t(actor.error.messageKey)}</p>;
  }
  return <LobbyRoom actor={actor.value} configuration={configuration} />;
}

export async function RoomPage() {
  return renderRoom(false);
}
export async function RoomSettingsPage() {
  return renderRoom(true);
}
