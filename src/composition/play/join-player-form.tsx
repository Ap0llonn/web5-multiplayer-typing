"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Actor } from "@/modules/identity/public";
import { AuthForm } from "@/modules/identity/presentation/auth-form";
import { sendLobbyCommand } from "@/modules/lobby/presentation/transport/lobby-command";
import { startLobbyHeartbeat } from "@/modules/lobby/presentation/transport/lobby-heartbeat";
import { CharacterPicker } from "@/modules/lobby/presentation/characters/character-picker";
import type { LobbyCharacter } from "@/modules/lobby/public";
import { Link, useRouter } from "@/shared/presentation/i18n/navigation";
import "./join-player-form.css";
import { Button } from "@/shared/presentation/ui/button";

export function JoinPlayerForm({
  code,
  actor,
  initialCharacter = "cobalt",
  alreadyJoined = false,
}: {
  code: string;
  actor: Actor | null;
  initialCharacter?: LobbyCharacter;
  alreadyJoined?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(actor !== null);
  const [character, setCharacter] = useState<LobbyCharacter>(initialCharacter);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (!alreadyJoined) return;
    return startLobbyHeartbeat(code, (result) => {
      if (!result.ok) setError(result.error.messageKey);
    });
  }, [code, alreadyJoined]);

  async function join() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    setConflict(false);
    try {
      const { result, currentRoom } = await sendLobbyCommand(
        "/api/lobbies/join",
        {
          code,
          role: "PARTICIPANT",
          character,
        },
      );
      if (result.ok) {
        router.push("/play/room");
        router.refresh();
      } else {
        setError(currentRoom ? "roomConflict" : result.error.messageKey);
        setConflict(Boolean(currentRoom));
      }
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <div className="join-player-page">
      <section className="join-player-card" aria-label={t("play.ticketLabel")}>
        <div className="join-player-ticket">
          <span>{t("play.ticketLabel")}</span>
          <span>
            {t("code")} <span className="join-player-code">{code}</span>
          </span>
        </div>
        <div className="grid gap-5">
          <h1 className="play-heading">{t("play.editorTitle")}</h1>
          <p className="text-muted">{t("play.editorDescription")}</p>
          {error && <p role="alert">{t(error)}</p>}
          {conflict ? (
            <Link href="/play/room" className="underline underline-offset-4">
              {t("returnToRoom")}
            </Link>
          ) : authenticated ? (
            <>
              {actor && <p>{actor.displayName}</p>}
              <CharacterPicker
                character={character}
                onChange={setCharacter}
                disabled={pending}
              />
              <Button disabled={pending} onClick={() => void join()}>
                {pending
                  ? t("pending")
                  : t(alreadyJoined ? "play.saveCharacter" : "join")}
              </Button>
            </>
          ) : (
            <AuthForm
              mode="guest"
              onAuthenticated={async () => {
                setAuthenticated(true);
                await join();
              }}
            >
              <CharacterPicker
                character={character}
                onChange={setCharacter}
                disabled={pending}
              />
            </AuthForm>
          )}
          <Link
            href={alreadyJoined ? "/play/room" : "/play"}
            className="underline underline-offset-4"
          >
            {t("play.backButton")}
          </Link>
        </div>
      </section>
    </div>
  );
}
