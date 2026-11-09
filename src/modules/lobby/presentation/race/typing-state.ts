import type { RaceEditInput } from "../../public";

export function normalizeRebasedEdits(
  text: string,
  initial: string,
  edits: (string | null)[],
): (string | null)[] {
  let intendedLength = initial.length;
  const normalized: (string | null)[] = [];
  for (const edit of edits) {
    if (edit === null) {
      // A deletion of an insertion beyond the new finish must not erase an earlier character.
      if (intendedLength > 0 && intendedLength <= text.length)
        normalized.push(null);
      intendedLength = Math.max(0, intendedLength - 1);
    } else {
      intendedLength++;
      if (intendedLength <= text.length) normalized.push(edit);
    }
  }
  return normalized;
}

export function rebasePendingEdits(
  self: { sequence: number; textRevision: number },
  pending: RaceEditInput,
  queued: (string | null)[],
): (string | null)[] {
  if (self.sequence === pending.sequence) return queued;
  if (
    self.sequence === pending.sequence - 1 &&
    self.textRevision !== (pending.textRevision ?? 0)
  )
    return [...pending.edits, ...queued];
  return [];
}

export function previewDraft(
  text: string,
  correction: "required" | "free",
  initial: string,
  edits: (string | null)[],
) {
  let draft = initial;
  for (const edit of edits) {
    if (edit === null) draft = draft.slice(0, -1);
    else if (
      draft.length < text.length &&
      (correction === "free" || text.startsWith(draft))
    )
      draft += edit;
  }
  return draft;
}
