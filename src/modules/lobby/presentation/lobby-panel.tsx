"use client";
import { LobbyRoster } from "./lobby-roster";
import { startLobbyHeartbeat } from "./lobby-heartbeat";
import { useEffect, useRef, useState, useReducer } from "react";
import { useTranslations } from "next-intl";
import type { LobbySnapshot, LobbyActor } from "../public";
import type { OperationResult } from "@/shared/contracts/operation-result";
import { lobbyViewReducer } from "./lobby-view-state";
import { sendLobbyCommand } from "./lobby-command";
import { Card } from "@/shared/presentation/ui/card";
import { Badge } from "@/shared/presentation/ui/badge";
import { Button } from "@/shared/presentation/ui/button";
import { Field, Input, Select } from "@/shared/presentation/ui/field";
import { Icon } from "@/shared/presentation/ui/icon";
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
    <Field label={t("role")}>
      <Select name="role" defaultValue="PARTICIPANT">
        <option value="PARTICIPANT">{t("PARTICIPANT")}</option>
        <option value="SPECTATOR">{t("SPECTATOR")}</option>
      </Select>
    </Field>
  );
  return (
    <div className="grid gap-5">
      {messageKey && <p role="alert">{t(messageKey)}</p>}
      {room ? (
        <Card aria-labelledby="active-room-title">
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
            onClick={() => send(`/api/lobbies/${room.code}/leave`, {})}
          >
            {t("leave")}
          </Button>
        </Card>
      ) : (
        <div className="action-grid">
          {actor.kind === "account" ? (
            <Card tone="yellow" aria-labelledby="create-room-title">
              <form
                className="grid h-full content-start gap-5"
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
                <div>
                  <Badge>{t("hostBadge")}</Badge>
                  <h2 id="create-room-title" className="card-title">
                    {t("create")}
                  </h2>
                  <p className="card-description">{t("createDescription")}</p>
                </div>
                <Field label={t("roomName")}>
                  <Input
                    name="name"
                    required
                    maxLength={60}
                    placeholder={t("roomPlaceholder")}
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t("capacity")}>
                    <Input
                      name="capacity"
                      type="number"
                      min={2}
                      max={30}
                      defaultValue={8}
                      required
                    />
                  </Field>
                  {roleField}
                </div>
                <Button type="submit" disabled={pending} className="w-full">
                  {pending ? t("pending") : t("create")}
                  <Icon name="arrow" />
                </Button>
              </form>
            </Card>
          ) : (
            <Card tone="yellow" aria-labelledby="create-room-title">
              <Badge>{t("hostBadge")}</Badge>
              <h2 id="create-room-title" className="card-title">
                {t("create")}
              </h2>
              <p>{t("guestLimit")}</p>
            </Card>
          )}
          <Card aria-labelledby="join-room-title">
            <form
              className="grid h-full content-start gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void send("/api/lobbies/join", {
                  code: data.get("code"),
                  role: data.get("role"),
                });
              }}
            >
              <div>
                <Badge tone="blue">{t("joinBadge")}</Badge>
                <h2 id="join-room-title" className="card-title">
                  {t("join")}
                </h2>
                <p className="card-description">{t("joinDescription")}</p>
              </div>
              <Field label={t("code")}>
                <Input
                  className="font-mono uppercase tracking-widest"
                  placeholder={t("codePlaceholder")}
                  name="code"
                  minLength={6}
                  maxLength={6}
                  autoComplete="off"
                  autoCapitalize="characters"
                  required
                />
              </Field>
              {roleField}
              <Button
                type="submit"
                variant="pink"
                disabled={pending}
                className="w-full"
              >
                {pending ? t("pending") : t("join")}
                <Icon name="arrow" />
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
