"use client";
import { useEffect, useRef, useState } from "react";
import type { LobbySnapshot, RaceEditInput, RaceSnapshot } from "../../public";
import type { OperationResult } from "@/shared/contracts/operation-result";
import {
  previewDraft,
  rebasePendingEdits,
  normalizeRebasedEdits,
} from "./typing-state";

export function useRaceTyping(
  code: string,
  race: RaceSnapshot,
  enabled: boolean,
  accept: (room: LobbySnapshot) => void,
) {
  const [draft, setDraft] = useState(race.self?.draft ?? "");
  const [message, setMessage] = useState("");
  const queue = useRef<(string | null)[]>([]);
  const sequence = useRef(race.self?.sequence ?? 0);
  const flight = useRef<RaceEditInput | null>(null);
  const sending = useRef(false);
  const current = useRef({ race, enabled, accept });
  useEffect(() => {
    current.current = { race, enabled, accept };
  });
  useEffect(() => {
    if (sending.current || flight.current || !race.self) return;
    if (race.self.sequence >= sequence.current) {
      if (race.self.sequence > sequence.current) queue.current = [];
      sequence.current = race.self.sequence;
      queue.current = normalizeRebasedEdits(
        race.self.text,
        race.self.draft,
        queue.current,
      );
      setDraft(
        previewDraft(
          race.self.text,
          race.settings.correction,
          race.self.draft,
          queue.current,
        ),
      );
    }
  }, [race.self, race.settings.correction]);
  useEffect(() => {
    let disposed = false;
    let controller: AbortController | undefined;
    const timer = setInterval(() => {
      void flush();
    }, 250);
    async function flush() {
      if (
        disposed ||
        sending.current ||
        !current.current.enabled ||
        (!flight.current && !queue.current.length)
      )
        return;
      if (!flight.current)
        flight.current = {
          raceId: current.current.race.id,
          sequence: sequence.current + 1,
          textRevision: current.current.race.self?.textRevision ?? 0,
          edits: queue.current.splice(0, 32),
        };
      sending.current = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 4000);
      try {
        const response = await fetch(`/api/lobbies/${code}/race/progress`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(flight.current),
          signal: controller.signal,
        });
        const result: OperationResult<LobbySnapshot> = await response.json();
        if (disposed) return;
        if (result.ok && result.value.race?.self) {
          const latest = current.current.race.self;
          const acknowledged =
            latest &&
            latest.sequence >= result.value.race.self.sequence &&
            latest.textRevision >= result.value.race.self.textRevision
              ? latest
              : result.value.race.self;
          sequence.current = acknowledged.sequence;
          queue.current =
            acknowledged.sequence >
            (flight.current?.sequence ?? acknowledged.sequence)
              ? []
              : normalizeRebasedEdits(
                  acknowledged.text,
                  acknowledged.draft,
                  queue.current,
                );
          flight.current = null;
          setMessage("");
          setDraft(
            previewDraft(
              acknowledged.text,
              current.current.race.settings.correction,
              acknowledged.draft,
              queue.current,
            ),
          );
          current.current.accept(result.value);
        } else if (!result.ok) {
          setMessage(result.error.messageKey);
          if (
            !["INTERNAL", "RATE_LIMITED", "PROVIDER_UNAVAILABLE"].includes(
              result.error.code,
            )
          ) {
            const rejected = flight.current;
            const resync: OperationResult<LobbySnapshot | null> = await (
              await fetch("/api/lobbies/me", { signal: controller.signal })
            ).json();
            if (!disposed && resync.ok && resync.value) {
              const recoveredRace = resync.value.race;
              const latest = current.current.race.self;
              const recovered = recoveredRace?.self;
              const self =
                recovered &&
                latest &&
                recoveredRace?.id === current.current.race.id &&
                latest.sequence >= recovered.sequence &&
                latest.textRevision >= recovered.textRevision
                  ? latest
                  : recovered;
              queue.current =
                self && rejected && resync.value.race?.id === rejected.raceId
                  ? rebasePendingEdits(self, rejected, queue.current)
                  : [];
              sequence.current = self?.sequence ?? 0;
              if (self)
                queue.current = normalizeRebasedEdits(
                  self.text,
                  self.draft,
                  queue.current,
                );
              flight.current = null;
              setDraft(
                self && recoveredRace
                  ? previewDraft(
                      self.text,
                      recoveredRace.settings.correction,
                      self.draft,
                      queue.current,
                    )
                  : "",
              );
              if (
                self &&
                rejected &&
                self.textRevision !== (rejected.textRevision ?? 0)
              )
                setMessage("");
              current.current.accept(resync.value);
            }
          }
        }
      } catch {
        if (!disposed) setMessage("race.retrying");
      } finally {
        clearTimeout(timeout);
        sending.current = false;
      }
    }
    return () => {
      disposed = true;
      clearInterval(timer);
      controller?.abort();
    };
  }, [code]);
  function change(value: string) {
    if (!enabled || queue.current.length > 64) return;
    let edits: (string | null)[];
    if (value.length === draft.length + 1 && value.startsWith(draft))
      edits = [value.slice(-1)];
    else if (draft.startsWith(value) && value.length < draft.length)
      edits = Array<null>(draft.length - value.length).fill(null);
    else return;
    const next = previewDraft(
      race.self?.text ?? race.text,
      race.settings.correction,
      draft,
      edits,
    );
    if (next === draft) return;
    queue.current.push(...edits);
    setDraft(next);
  }
  return { draft, change, message };
}
