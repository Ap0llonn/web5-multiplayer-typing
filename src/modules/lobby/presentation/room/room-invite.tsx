"use client";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CreatedInvitation } from "../../public";
import type { OperationResult } from "@/shared/contracts/operation-result";
import { Button } from "@/shared/presentation/ui/button";

export function RoomInvite({ code }: { code: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  async function create() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/lobbies/${code}/invitations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const result: OperationResult<CreatedInvitation> = await response.json();
      if (!result.ok) {
        setMessage(result.error.messageKey);
        return;
      }
      const link = new URL(`/${locale}/play/player`, window.location.origin);
      link.searchParams.set("code", code);
      link.hash = new URLSearchParams({
        invite: result.value.token,
      }).toString();
      setUrl(link.toString());
    } catch {
      setMessage("errors.INTERNAL");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("invites.copied");
    } catch {
      setMessage("invites.copyFailed");
    }
  }
  async function share() {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: t("invites.title"), url });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setMessage("invites.copyFailed");
    }
  }
  return (
    <section
      aria-label={t("invites.title")}
      className="my-4 grid min-w-0 gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4"
    >
      <h2 className="text-lg font-black">{t("invites.title")}</h2>
      <p className="text-sm text-muted">{t("invites.description")}</p>
      <div>
        <Button size="small" disabled={pending} onClick={() => void create()}>
          {pending ? t("pending") : t("invites.create")}
        </Button>
      </div>
      {url && (
        <>
          <a
            href={url}
            className="break-all underline"
            referrerPolicy="no-referrer"
          >
            {t("invites.open")}
          </a>
          <label className="grid gap-1 text-sm font-bold">
            {t("invites.link")}
            <input
              value={url}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 rounded-lg border border-[var(--control-border)] bg-[var(--panel)] p-2"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button size="small" variant="paper" onClick={() => void copy()}>
              {t("invites.copy")}
            </Button>
            <Button size="small" variant="paper" onClick={() => void share()}>
              {t("invites.share")}
            </Button>
          </div>
        </>
      )}
      {message && (
        <p role="status" className="text-sm">
          {t(message)}
        </p>
      )}
    </section>
  );
}
