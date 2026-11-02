"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PublicLobbySummary } from "@/modules/lobby/public";
import type { OperationResult } from "@/shared/contracts/operation-result";
import { Link, useRouter } from "@/shared/presentation/i18n/navigation";
import { Button, buttonStyles } from "@/shared/presentation/ui/button";
import { Card } from "@/shared/presentation/ui/card";

export function QuickPlay() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [empty, setEmpty] = useState<{ canCreate: boolean }>();
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );

  async function findRoom() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(undefined);
    setEmpty(undefined);
    const timeout = setTimeout(() => controller.abort(), 4_000);
    try {
      const response = await fetch("/api/lobbies/quick", {
        cache: "no-store",
        signal: controller.signal,
      });
      const result: OperationResult<{
        room: PublicLobbySummary | null;
        canCreate: boolean;
      }> = await response.json();
      if (request.current !== controller) return;
      if (!result.ok) setError(result.error.messageKey);
      else if (!response.ok) setError("errors.INTERNAL");
      else if (!result.value.room)
        setEmpty({ canCreate: result.value.canCreate });
      else router.push(`/play/player?code=${result.value.room.code}`);
    } catch {
      if (request.current === controller) setError("errors.INTERNAL");
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }

  return (
    <Card className="grid gap-3" data-testid="quick-play">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">{t("quickPlay.title")}</h2>
          <p className="mt-1 text-sm text-muted">
            {t("quickPlay.description")}
          </p>
        </div>
        <Button
          variant="pink"
          disabled={pending}
          onClick={() => void findRoom()}
        >
          {pending ? t("pending") : t("quickPlay.action")}
        </Button>
      </div>
      {error && <p role="alert">{t(error)}</p>}
      {empty && (
        <div role="status" className="grid justify-items-start gap-3">
          <p>
            {t(
              empty.canCreate
                ? "quickPlay.emptyAccount"
                : "quickPlay.emptyGuest",
            )}
          </p>
          {empty.canCreate && (
            <Link
              href="/play/create"
              className={buttonStyles({ variant: "ink", size: "small" })}
            >
              {t("siteNav.createRace")}
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
