"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
  failure,
  type OperationResult,
} from "@/shared/contracts/operation-result";
import type { LobbySnapshot } from "../../public";
import { startLobbyHeartbeat } from "../transport/lobby-heartbeat";
import { sendLobbyCommand } from "../transport/lobby-command";
import { lobbyViewReducer } from "./lobby-view-state";

export function useLobbyRoom() {
  const [loaded, setLoaded] = useState(false);
  const [view, dispatch] = useReducer(lobbyViewReducer, {
    room: null,
    generation: 0,
  });
  const room = view.room;
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [stream, setStream] = useState("connecting");
  const [presence, setPresence] = useState("connecting");
  const connection: "connected" | "connecting" | "disconnected" =
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
      })
      .finally(() => {
        if (active) setLoaded(true);
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
  async function send(
    path: string,
    body: unknown,
  ): Promise<OperationResult<LobbySnapshot>> {
    if (lock.current) return failure("CONFLICT");
    lock.current = true;
    setPending(true);
    setError("");
    const generation = view.generation;
    try {
      const { result, currentRoom } = await sendLobbyCommand(path, body);
      if (result.ok) {
        dispatch({
          type: "command",
          room: path.endsWith("/leave") ? null : result.value,
        });
      } else {
        if (currentRoom)
          dispatch({ type: "recovered", generation, room: currentRoom });
        else setError(result.error.messageKey);
      }
      return result;
    } catch {
      setError("errors.INTERNAL");
      return failure("INTERNAL");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  const messageKey = error || (view.conflictNotice ? "roomConflict" : "");
  return { room, loaded, pending, connection, messageKey, send };
}
