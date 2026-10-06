"use client";
import { startLobbyHeartbeat } from "./lobby-heartbeat";
import { useEffect, useRef, useState, useReducer } from "react";
import { useTranslations } from "next-intl";
import type { LobbySnapshot, LobbyActor } from "../public";
import type { OperationResult } from "@/shared/contracts/operation-result";
import { lobbyViewReducer } from "./lobby-view-state";
import { sendLobbyCommand } from "./lobby-command";
import { ActiveRoomCard } from "./active-room-card";
import {
  CreateRoomCard,
  GuestCreateCard,
  JoinRoomCard,
} from "./lobby-entry-cards";
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
  return (
    <div className="grid gap-5">
      {messageKey && <p role="alert">{t(messageKey)}</p>}
      {room ? (
        <ActiveRoomCard
          room={room}
          connection={connection}
          pending={pending}
          onLeave={() => {
            void send(`/api/lobbies/${room.code}/leave`, {});
          }}
        />
      ) : (
        <div className="action-grid">
          <JoinRoomCard
            pending={pending}
            onSubmit={(data) => {
              void send("/api/lobbies/join", {
                code: data.get("code"),
                role: data.get("role"),
              });
            }}
          />
          {actor.kind === "account" ? (
            <CreateRoomCard
              pending={pending}
              onSubmit={(data) => {
                void send("/api/lobbies", {
                  name: data.get("name"),
                  capacity: Number(data.get("capacity")),
                  role: data.get("role"),
                });
              }}
            />
          ) : (
            <GuestCreateCard />
          )}
        </div>
      )}
    </div>
  );
}
