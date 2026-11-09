import { describe, expect, it } from "vitest";
import { generateRaceText } from "@/modules/lobby/domain/race-text";
const base = {
  language: "fr" as const,
  wordCount: 10,
  durationSeconds: null,
  correction: "required" as const,
};
describe("text generation", () => {
  const corpus = [
    {
      content:
        "Le chat dort près du feu. Cette promenade extraordinaire traverse paisiblement notre magnifique bibliothèque. Le soir arrive et tout le monde rentre dans la maison.",
      source: "fixture",
    },
  ];
  const dictionary = [
    "chat",
    "bleu",
    "été",
    "route",
    "maison",
    "petite",
    "promenade",
    "extraordinaire",
  ];
  it("extracts exactly the requested contiguous words and ranks coherent windows by measurable complexity", () => {
    const easy = generateRaceText(
      {
        ...base,
        complexity: "easy",
        punctuation: false,
        uppercase: false,
        accents: false,
      },
      corpus,
      dictionary,
      () => 0,
    );
    const hard = generateRaceText(
      {
        ...base,
        complexity: "hard",
        punctuation: false,
        uppercase: false,
        accents: false,
      },
      corpus,
      dictionary,
      () => 0,
    );
    expect(easy.ok && easy.value.split(" ")).toHaveLength(10);
    expect(hard.ok && hard.value.split(" ")).toHaveLength(10);
    if (!easy.ok || !hard.ok) throw Error();
    expect(easy.value).not.toMatch(/[A-Zéè.!]/);
    expect(hard.value.replaceAll(" ", "").length).toBeGreaterThan(
      easy.value.replaceAll(" ", "").length,
    );
  });
  it("generates dictionary words with exact length, inclusion/exclusion and independent switches", () => {
    const result = generateRaceText(
      {
        ...base,
        mode: "random",
        complexity: "easy",
        includeCharacters: "é",
        excludeCharacters: "b",
        accents: true,
        punctuation: false,
        numbers: false,
        uppercase: false,
      },
      corpus,
      dictionary,
      () => 0.5,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error();
    expect(result.value.split(" ")).toHaveLength(10);
    expect(result.value).toContain("é");
    expect(result.value).not.toMatch(/[bA-Z0-9.!]/);
    const impossible = generateRaceText(
      {
        ...base,
        mode: "random",
        excludeCharacters: "abcdefghijklmnopqrstuvwxyzé",
      },
      corpus,
      dictionary,
      () => 0,
    );
    expect(impossible).toMatchObject({
      ok: false,
      error: { code: "VALIDATION" },
    });
  });
  it("refuses short/absent corpus rather than silently shortening or fabricating a passage", () => {
    expect(
      generateRaceText(
        base,
        [{ content: "Deux mots", source: "fixture" }],
        dictionary,
        () => 0,
      ),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

it("applies each random-text switch independently and preserves all requested characters", () => {
  const dictionary = ["été", "chat", "bleu", "nuit"];
  for (const flag of [
    "punctuation",
    "numbers",
    "uppercase",
    "accents",
  ] as const) {
    const settings = {
      ...base,
      mode: "random" as const,
      complexity: "easy" as const,
      punctuation: false,
      numbers: false,
      uppercase: false,
      accents: false,
      [flag]: true,
    };
    const result = generateRaceText(settings, [], dictionary, () => 0);
    if (!result.ok) throw Error("Expected compatible dictionary");
    expect(result.value.split(" ")).toHaveLength(10);
    const patterns = {
      punctuation: /[.,!?;:]/,
      numbers: /[0-9]/,
      uppercase: /[A-ZÉ]/,
      accents: /é/,
    };
    for (const other of [
      "punctuation",
      "numbers",
      "uppercase",
      "accents",
    ] as const)
      if (other === flag) expect(result.value).toMatch(patterns[other]);
      else expect(result.value).not.toMatch(patterns[other]);
  }
  const included = generateRaceText(
    {
      ...base,
      mode: "random",
      complexity: "easy",
      includeCharacters: "éA9!",
      excludeCharacters: "z",
    },
    [],
    ["été", "avec"],
    () => 0,
  );
  expect(included.ok).toBe(true);
  if (!included.ok) throw Error();
  for (const char of "éA9!") expect(included.value).toContain(char);
});
