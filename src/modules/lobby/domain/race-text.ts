import {
  failure,
  success,
  type OperationResult,
} from "@/shared/contracts/operation-result";
import type { RaceSettings } from "../contracts/race";
import { raceSettingsSchema } from "../contracts/race-schemas";

export function withoutAccents(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("œ", "oe")
    .replaceAll("Œ", "OE");
}
export function generateRaceText(
  input: RaceSettings,
  corpus: { content: string; source: string }[],
  dictionary: string[],
  random: () => number,
): OperationResult<string> {
  const parsed = raceSettingsSchema.safeParse(input);
  if (!parsed.success) return failure("VALIDATION");
  const s = parsed.data;
  function choose<T>(items: T[]): T {
    return items[
      Math.min(
        items.length - 1,
        Math.max(0, Math.floor(random() * items.length)),
      )
    ];
  }
  function normalize(text: string) {
    let value = text.normalize("NFC");
    if (!s.accents) value = withoutAccents(value);
    if (!s.uppercase) value = value.toLowerCase();
    if (!s.numbers) value = value.replace(/\p{N}/gu, "");
    if (!s.punctuation) value = value.replace(/[^\p{L}\p{N}\s]/gu, "");
    return value;
  }
  if (s.mode === "coherent") {
    const candidates: { text: string; score: number }[] = [];
    for (const entry of corpus) {
      const words = normalize(entry.content)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      for (let i = 0; i + s.wordCount <= words.length; i++) {
        const text = words.slice(i, i + s.wordCount).join(" ");
        const letters = text.replace(/[^\p{L}\p{N}]/gu, "").length;
        candidates.push({ text, score: letters / s.wordCount });
      }
    }
    if (!candidates.length) return failure("NOT_FOUND");
    candidates.sort(
      (a, b) => a.score - b.score || a.text.localeCompare(b.text, s.language),
    );
    const level = { easy: 0, medium: 1, hard: 2 }[s.complexity];
    const from = Math.floor((candidates.length * level) / 3);
    const to = Math.max(
      from + 1,
      Math.floor((candidates.length * (level + 1)) / 3),
    );
    return success(choose(candidates.slice(from, to)).text);
  }
  const excludes = [...s.excludeCharacters];
  const allowed = (word: string) => !excludes.some((c) => word.includes(c));
  const pool = [
    ...new Set(
      dictionary
        .map((w) => normalize(w.toLowerCase()))
        .filter((w) => {
          if (!/^[\p{L}]+$/u.test(w) || !allowed(w)) return false;
          const n = withoutAccents(w).length;
          return s.complexity === "easy"
            ? n <= 4
            : s.complexity === "medium"
              ? n >= 5 && n <= 7
              : n >= 8;
        }),
    ),
  ];
  if (!pool.length) return failure("VALIDATION");
  const words = Array.from({ length: s.wordCount }, () => choose(pool));
  // Replace whole words, never invent letters inside dictionary words.
  const requiredWords: string[] = [];
  for (const c of new Set(s.includeCharacters)) {
    if (requiredWords.join(" ").includes(c)) continue;
    const matches = pool
      .flatMap((w) => [
        w,
        ...(s.uppercase ? [w[0].toUpperCase() + w.slice(1)] : []),
      ])
      .filter((w) => w.includes(c) && allowed(w));
    if (matches.length) requiredWords.push(choose(matches));
    else if (/^[0-9]$/.test(c) && s.numbers && allowed(c))
      requiredWords.push(c);
    else if (/^[.,;:!?'-]$/.test(c) && s.punctuation && allowed(c))
      requiredWords.push(choose(pool) + c);
    else return failure("VALIDATION");
  }
  if (requiredWords.length > words.length) return failure("VALIDATION");
  words.splice(0, requiredWords.length, ...requiredWords);
  for (let i = requiredWords.length; i < words.length; i++) {
    if (s.uppercase && i % 5 === 0) {
      const capitalized = words[i][0].toUpperCase() + words[i].slice(1);
      if (allowed(capitalized)) words[i] = capitalized;
    }
    if (s.numbers && i === words.length - 2) {
      const digits = "0123456789".split("").filter(allowed);
      if (digits.length) words[i] = choose(digits) + choose(digits);
    }
    if (s.punctuation && i % 4 === 3) {
      const punctuation = [",", ".", "!", "?", ";", ":"].filter(allowed);
      if (punctuation.length) words[i] += choose(punctuation);
    }
  }
  return success(words.join(" "));
}
