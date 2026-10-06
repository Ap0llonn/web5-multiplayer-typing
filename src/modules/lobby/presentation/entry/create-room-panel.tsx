"use client";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/shared/presentation/i18n/navigation";
import { Button } from "@/shared/presentation/ui/button";
import { Card } from "@/shared/presentation/ui/card";
import { useLobbyRoom } from "../room/use-lobby-room";
import { CreateRoomCard } from "./create-room-card";

export function CreateRoomPanel() {
  const t = useTranslations();
  const router = useRouter();
  const { room, pending, messageKey, send } = useLobbyRoom();
  async function enter(path: string, data: object) {
    const result = await send(path, data);
    if (result.ok) router.push("/play/room");
  }
  return (
    <div className="grid gap-5">
      {messageKey && <p role="alert">{t(messageKey)}</p>}
      {room ? (
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/play/room"
              className="font-bold underline underline-offset-4"
            >
              {t("returnToRoom")} ·{" "}
              <span data-testid="room-code">{room.code}</span>
            </Link>
            <Button
              variant="paper"
              disabled={pending}
              onClick={() => void send(`/api/lobbies/${room.code}/leave`, {})}
            >
              {t("leave")}
            </Button>
          </div>
        </Card>
      ) : (
        <CreateRoomCard
          pending={pending}
          onSubmit={(data) => {
            void enter("/api/lobbies", {
              name: data.get("name"),
              capacity: Number(data.get("capacity")),
              role: data.get("role"),
              character: data.get("character"),
            });
          }}
        />
      )}
    </div>
  );
}
