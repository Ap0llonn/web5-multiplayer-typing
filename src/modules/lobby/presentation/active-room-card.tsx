import { useTranslations } from "next-intl";
import type { LobbySnapshot } from "../public";
import { Card } from "@/shared/presentation/ui/card";
import { Badge } from "@/shared/presentation/ui/badge";
import { Button } from "@/shared/presentation/ui/button";
import { LobbyRoster } from "./lobby-roster";

export function ActiveRoomCard({
  room,
  connection,
  pending,
  onLeave,
}: {
  room: LobbySnapshot;
  connection: "connected" | "connecting" | "disconnected";
  pending: boolean;
  onLeave: () => void;
}) {
  const t = useTranslations();
  return (
    <Card className="active-room" aria-labelledby="active-room-title">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Badge tone="mint">{t(room.state)}</Badge>
        <span className="text-sm font-bold">
          {t("connection")}: {t(connection)}
        </span>
      </div>
      <h2 id="active-room-title" className="card-title">
        {room.name}
      </h2>
      <div className="room-code-panel">
        <p className="font-mono text-xs font-bold uppercase tracking-wider">
          {t("code")}
        </p>
        <p className="code" data-testid="room-code">
          {room.code}
        </p>
        <p className="text-sm">{t("shareCode")}</p>
      </div>
      <LobbyRoster room={room} />
      <Button
        variant="paper"
        className="mt-6"
        disabled={pending}
        onClick={onLeave}
      >
        {t("leave")}
      </Button>
    </Card>
  );
}
