"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { OperationResult } from "@/shared/contracts/operation-result";
import type { PublicLobbySummary } from "../../public";
import { Link } from "@/shared/presentation/i18n/navigation";
import { Button, buttonStyles } from "@/shared/presentation/ui/button";
import { Card } from "@/shared/presentation/ui/card";
import { pollPublicLobbies } from "../transport/public-lobbies-poll";

export function PublicLobbies({
  initialResult,
}: {
  initialResult: OperationResult<PublicLobbySummary[]>;
}) {
  const t = useTranslations();
  const [result, setResult] = useState(initialResult);
  const [refreshing, setRefreshing] = useState(false);
  const poll = useRef<ReturnType<typeof pollPublicLobbies> | null>(null);
  useEffect(() => {
    const running = pollPublicLobbies((next) => {
      setResult(next);
      setRefreshing(false);
    });
    poll.current = running;
    return () => {
      running.stop();
      poll.current = null;
    };
  }, []);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{t("lobbies.liveHint")}</p>
        <Button
          variant="paper"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true);
            void poll.current?.refresh();
          }}
        >
          {refreshing ? t("pending") : t("refresh")}
        </Button>
      </div>
      {!result.ok ? (
        <p role="alert">{t(result.error.messageKey)}</p>
      ) : result.value.length === 0 ? (
        <Card>
          <h2 className="text-xl font-extrabold">{t("lobbies.emptyTitle")}</h2>
          <p className="mt-2 text-muted">{t("lobbies.emptyDescription")}</p>
        </Card>
      ) : (
        <ul
          className="grid gap-4 md:grid-cols-2"
          aria-label={t("lobbies.listLabel")}
        >
          {result.value.map((room) => {
            const joinable =
              room.state === "WAITING" || room.state === "RESULTS";
            return (
              <li key={room.code} data-testid="public-lobby">
                <Card className="flex h-full flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="min-w-0 break-words text-xl font-extrabold">
                      {room.name}
                    </h2>
                    <span className="text-sm font-bold">{t(room.state)}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted">{t("host")}</dt>
                      <dd className="break-words font-bold">{room.hostName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">
                        {t("lobbies.participants")}
                      </dt>
                      <dd className="font-bold">
                        {t("lobbies.slots", {
                          count: room.participantCount,
                          capacity: room.capacity,
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">{t("SPECTATOR")}</dt>
                      <dd className="font-bold">
                        {t("lobbies.spectators", {
                          count: room.spectatorCount,
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">{t("code")}</dt>
                      <dd className="font-mono font-bold">{room.code}</dd>
                    </div>
                  </dl>
                  {room.participantCount >= room.capacity && (
                    <p className="text-sm text-muted">{t("lobbies.full")}</p>
                  )}
                  {joinable ? (
                    <Link
                      href={`/play/player?code=${room.code}`}
                      className={buttonStyles({
                        variant: "pink",
                        className: "mt-auto",
                      })}
                    >
                      {t("join")}
                    </Link>
                  ) : (
                    <p className="mt-auto text-sm text-muted">
                      {t("lobbies.notJoinable")}
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
