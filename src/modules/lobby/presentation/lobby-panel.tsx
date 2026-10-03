"use client";
import { LobbyRoster } from "./lobby-roster";
import { startLobbyHeartbeat } from "./lobby-heartbeat";
import { useEffect, useRef, useState, useReducer } from "react";
import { useTranslations } from "next-intl";
import type { LobbySnapshot, LobbyActor } from "../public";
import type { OperationResult } from "@/shared/contracts/operation-result";
import { lobbyViewReducer } from "./lobby-view-state";
import { sendLobbyCommand } from "./lobby-command";
export function LobbyPanel({ actor }: { actor: LobbyActor }) {
  const t = useTranslations();
  const [view, dispatch] = useReducer(lobbyViewReducer, {
    room: null,
    generation: 0,
  });
  const room = view.room;
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [stream, setStream] = useState("connecting");
  const [presence, setPresence] = useState("connecting");
  const connection =
    stream === "connected" && presence === "connected"
      ? "connected"
      : stream === "disconnected" || presence === "disconnected"
        ? "disconnected"
        : "connecting";
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    fetch("/api/lobbies/me")
      .then((r) => r.json())
      .then((r: OperationResult<LobbySnapshot | null>) => {
        if (!active) return;
        if (r.ok) dispatch({ type: "loaded", generation: 0, room: r.value });
        else setError(r.error.messageKey);
      })
      .catch(() => {
        if (active) setError("errors.INTERNAL");
      });
    return () => {
      active = false;
    };
  }, []);
  const code = room?.code;
  useEffect(() => {
    if (!code) return;
    return startLobbyHeartbeat(code, (result) => {
      if (result.ok) setPresence("connected");
      else {
        setPresence("disconnected");
        if (
          ![
            "CONFLICT",
            "INTERNAL",
            "RATE_LIMITED",
            "PROVIDER_UNAVAILABLE",
          ].includes(result.error.code)
        ) {
          setError(result.error.messageKey);
          dispatch({ type: "command", room: null });
        }
      }
    });
  }, [code]);
  useEffect(() => {
    if (!code) return;
    const events = new EventSource(`/api/lobbies/${code}/events`);
    events.addEventListener("open", () => setStream("connected"));
    events.addEventListener("error", () => setStream("disconnected"));
    events.addEventListener("snapshot", (event) => {
      try {
        const result = JSON.parse(event.data) as OperationResult<LobbySnapshot>;
        if (result.ok) {
          dispatch({ type: "snapshot", code, room: result.value });
          setStream("connected");
        } else {
          setError(result.error.messageKey);
          events.close();
          dispatch({ type: "command", room: null });
        }
      } catch {
        setError("errors.INTERNAL");
      }
    });
    events.addEventListener("transient-error", () => setStream("disconnected"));
    return () => events.close();
  }, [code]);
  async function send(path: string, body: unknown) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    const generation = view.generation;
    try {
      const { result, currentRoom } = await sendLobbyCommand(path, body);
      if (result.ok)
        dispatch({
          type: "command",
          room: path.endsWith("/leave") ? null : result.value,
        });
      else {
        if (currentRoom)
          dispatch({ type: "recovered", generation, room: currentRoom });
        else setError(result.error.messageKey);
      }
    } catch {
      setError("errors.INTERNAL");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  const messageKey = error || (view.conflictNotice ? "roomConflict" : "");
  const roleField = (
    <label>
      {t("role")}
      <select name="role" defaultValue="PARTICIPANT">
        <option value="PARTICIPANT">{t("PARTICIPANT")}</option>
        <option value="SPECTATOR">{t("SPECTATOR")}</option>
      </select>
    </label>
  );
  return (
    <div className="grid gap-5">
      {messageKey && <p role="alert">{t(messageKey)}</p>}
      {room ? (
        <section>
          <h2>{room.name}</h2>
          <p>
            {t(room.state)} · {t("connection")}: {t(connection)}
          </p>
          <p className="code" data-testid="room-code">
            {room.code}
          </p>
          <LobbyRoster room={room} />
          <button
            disabled={pending}
            onClick={() => send(`/api/lobbies/${room.code}/leave`, {})}
          >
            {t("leave")}
          </button>
        </section>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {actor.kind === "account" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void send("/api/lobbies", {
                  name: data.get("name"),
                  capacity: Number(data.get("capacity")),
                  role: data.get("role"),
                });
              }}
            >
              <h2>{t("create")}</h2>
              <label>
                {t("roomName")}
                <input name="name" required maxLength={60} />
              </label>
              <label>
                {t("capacity")}
                <input
                  name="capacity"
                  type="number"
                  min={2}
                  max={30}
                  defaultValue={8}
                  required
                />
              </label>
              {roleField}
              <button disabled={pending}>{t("create")}</button>
            </form>
          ) : (
            <section>
              <p>{t("guestLimit")}</p>
            </section>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void send("/api/lobbies/join", {
                code: data.get("code"),
                role: data.get("role"),
              });
            }}
          >
            <h2>{t("join")}</h2>
            <label>
              {t("code")}
              <input
                name="code"
                minLength={6}
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
                required
              />
            </label>
            {roleField}
            <button disabled={pending}>{t("join")}</button>
          </form>
        </div>
      )}
    </div>
  );
}
