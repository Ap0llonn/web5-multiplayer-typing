"use client";
import { useTranslations } from "next-intl";
import type { LobbySnapshot } from "../public";
import { Badge } from "@/shared/presentation/ui/badge";
export function LobbyRoster({ room }: { room: LobbySnapshot }) {
  const t = useTranslations();
  return (
    <>
      <h3 className="mb-4 text-lg font-extrabold">{t("roster")}</h3>
      <ul className="grid gap-3">
        {room.members.map((m) => (
          <li
            className="member-row"
            data-testid="member-row"
            key={m.playerIdentityId}
          >
            <span aria-hidden="true" className="member-avatar">
              {m.displayName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <span className="block break-words font-bold">
                {m.displayName}
              </span>
              <span className="text-sm text-muted">
                <span data-testid="member-kind">
                  {t(`memberKind.${m.kind}`)}
                </span>{" "}
                · {t(m.role)} · {t(m.online ? "online" : "offline")}
              </span>
            </div>
            {m.playerIdentityId === room.hostPlayerIdentityId && (
              <Badge tone="yellow">{t("host")}</Badge>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
