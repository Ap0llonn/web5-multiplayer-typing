"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import type { LobbyCharacter } from "../../public";
import { PlayerCharacter } from "./player-character";
import "./characters.css";

const characters: readonly LobbyCharacter[] = [
  "cobalt",
  "coral",
  "mint",
  "butter",
];
export function CharacterPicker({
  character,
  onChange,
  disabled = false,
}: {
  character: LobbyCharacter;
  onChange: (character: LobbyCharacter) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("play");
  const id = useId();
  return (
    <fieldset className="character-picker" disabled={disabled}>
      <legend id={`${id}-label`} className="character-label">
        {t("characterLabel")}
      </legend>
      <div
        className="character-options"
        role="radiogroup"
        aria-labelledby={`${id}-label`}
      >
        {characters.map((choice) => (
          <label
            className={`character-choice${character === choice ? " character-choice-selected" : ""}`}
            key={choice}
          >
            <input
              type="radio"
              className="sr-only"
              name="character"
              value={choice}
              checked={character === choice}
              onChange={() => onChange(choice)}
            />
            <PlayerCharacter character={choice} />
            <span>{t(`characters.${choice}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
