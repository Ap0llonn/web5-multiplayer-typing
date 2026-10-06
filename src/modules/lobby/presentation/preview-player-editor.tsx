"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/presentation/ui/button";
import { Field, Input } from "@/shared/presentation/ui/field";
import { Icon } from "@/shared/presentation/ui/icon";
import { PreviewAvatar, type PreviewStyle } from "./preview-avatar";

const styles: readonly PreviewStyle[] = ["cobalt", "coral", "mint", "butter"];

export function PreviewPlayerEditor({
  name,
  style,
  ready,
  onNameChange,
  onStyleChange,
  onReady,
  onCancel,
}: {
  name: string;
  style: PreviewStyle;
  ready: boolean;
  onNameChange: (name: string) => void;
  onStyleChange: (style: PreviewStyle) => void;
  onReady: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("playPreview");
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const isValidName = name.trim().length >= 3 && name.trim().length <= 20;
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <form
      className="pp-player-editor"
      aria-labelledby={`${id}-title`}
      onSubmit={(event) => {
        event.preventDefault();
        if (isValidName) onReady();
      }}
    >
      <div>
        <h1
          ref={heading}
          tabIndex={-1}
          id={`${id}-title`}
          className="pp-setup-heading"
        >
          {t("editorTitle")}
        </h1>
        <p className="pp-panel-description">{t("editorDescription")}</p>
      </div>
      <div>
        <Field label={t("nicknameLabel")}>
          <Input
            name="nickname"
            autoComplete="nickname"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder={t("nicknamePlaceholder")}
            minLength={3}
            maxLength={20}
            required
            aria-describedby={`${id}-name-hint`}
          />
        </Field>
        <p id={`${id}-name-hint`} className="pp-field-hint">
          {t("nicknameHint")}
        </p>
      </div>
      <fieldset className="pp-style-fieldset">
        <legend id={`${id}-style-label`} className="pp-field-label">
          {t("styleLabel")}
        </legend>
        <div
          className="pp-style-grid"
          role="radiogroup"
          aria-labelledby={`${id}-style-label`}
        >
          {styles.map((choice) => (
            <label
              key={choice}
              className={`pp-style-choice${style === choice ? " pp-style-choice--selected" : ""}`}
            >
              <input
                type="radio"
                className="pp-style-input sr-only"
                name={`${id}-style`}
                value={choice}
                checked={style === choice}
                onChange={() => onStyleChange(choice)}
              />
              <PreviewAvatar style={choice} />
              <span className="pp-style-name">{t(`styles.${choice}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="pp-editor-actions">
        <Button
          type="submit"
          variant="blue"
          className="pp-ready-button"
          disabled={!isValidName}
        >
          {t(ready ? "updatePlayer" : "readyButton")}
          <Icon name={ready ? "check" : "arrow"} />
        </Button>
        {onCancel && (
          <Button type="button" variant="paper" onClick={onCancel}>
            {t(ready ? "cancelEdit" : "backButton")}
          </Button>
        )}
      </div>
    </form>
  );
}
