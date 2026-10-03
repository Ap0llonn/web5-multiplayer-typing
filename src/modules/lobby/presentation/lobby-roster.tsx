"use client";
import { useTranslations } from "next-intl";
import type { LobbySnapshot } from "../public";
export function LobbyRoster({ room }: { room: LobbySnapshot }) {
  const t = useTranslations();
  return (
    <>
      <h2>{t("roster")}</h2>
      <ul>
        {room.members.map((m) => (
          <li data-testid="member-row" key={m.playerIdentityId}>
            <span
              aria-hidden="true"
              className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full border font-mono"
            >
              {m.displayName.slice(0, 2).toUpperCase()}
            </span>
            <span>{m.displayName}</span> ·{" "}
            <span data-testid="member-kind">{t(`memberKind.${m.kind}`)}</span> ·{" "}
            {t(m.role)}{" "}
            {m.playerIdentityId === room.hostPlayerIdentityId &&
              `· ${t("host")}`}{" "}
            · {t(m.online ? "online" : "offline")}
          </li>
        ))}
      </ul>
    </>
  );
}
