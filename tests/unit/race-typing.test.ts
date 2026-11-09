import { expect, it } from "vitest";
import {
  previewDraft,
  rebasePendingEdits,
  normalizeRebasedEdits,
} from "@/modules/lobby/presentation/race/typing-state";
it("previews required and free correction with Backspace without accepting a paste as a stroke", () => {
  expect(previewDraft("abc", "required", "", ["x", "b"])).toBe("x");
  expect(previewDraft("abc", "required", "x", [null, "a", "b"])).toBe("ab");
  expect(previewDraft("abc", "free", "", ["a", "x", "c"])).toBe("axc");
  expect(previewDraft("abc", "free", "abc", ["d"])).toBe("abc");
});
it("preserves deletion intent when a shortcut removes an in-flight suffix", () => {
  const pending = ["h", "a", " ", "b", null, null];
  expect(
    previewDraft("alpha bravo charlie delta", "required", "alp", pending),
  ).toBe("alpha");
  const normalized = normalizeRebasedEdits("alpha", "alp", pending);
  expect(normalized).toEqual(["h", "a"]);
  expect(previewDraft("alpha", "required", "alp", normalized)).toBe("alpha");
  expect(normalizeRebasedEdits("alpha", "alp", [...pending, null])).toEqual([
    "h",
    "a",
    null,
  ]);
});
it("rebases an unacknowledged old-revision batch without losing keystrokes or resending acknowledged edits", () => {
  const pending = {
    raceId: "race",
    sequence: 2,
    textRevision: 0,
    edits: ["b", "c"],
  };
  expect(
    rebasePendingEdits({ sequence: 1, textRevision: 1 }, pending, ["d"]),
  ).toEqual(["b", "c", "d"]);
  expect(
    rebasePendingEdits({ sequence: 2, textRevision: 1 }, pending, ["d"]),
  ).toEqual(["d"]);
  expect(
    rebasePendingEdits({ sequence: 0, textRevision: 1 }, pending, ["d"]),
  ).toEqual([]);
});
