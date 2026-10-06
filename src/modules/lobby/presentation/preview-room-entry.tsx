import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/presentation/ui/button";
import { Input } from "@/shared/presentation/ui/field";
import { Icon } from "@/shared/presentation/ui/icon";
import { DecorativeImage } from "@/shared/presentation/ui/decorative-image";
import { roomCodeSchema } from "../contracts/lobby-schemas";

export function PreviewRoomEntry({
  onEnter,
}: {
  onEnter: (code: string) => void;
}) {
  const t = useTranslations("playPreview");
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section className="pp-entry" aria-labelledby={`${id}-title`}>
      <div className="pp-entry-content">
        <p className="pp-eyebrow">{t("entryEyebrow")}</p>
        <h1
          ref={heading}
          tabIndex={-1}
          id={`${id}-title`}
          className="pp-entry-title"
        >
          {t("entryTitle")}
        </h1>
        <p className="pp-entry-description">{t("entryDescription")}</p>
        <form
          className="pp-entry-form"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("code");
            const code = roomCodeSchema.safeParse(value);
            if (code.success) onEnter(code.data);
          }}
        >
          <label className="pp-field-label" htmlFor={`${id}-room`}>
            {t("roomCodeLabel")}
          </label>
          <div className="pp-entry-control">
            <Input
              id={`${id}-room`}
              className="pp-code-input"
              name="code"
              placeholder={t("roomCodePlaceholder")}
              pattern="\s*[23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz]{6}\s*"
              minLength={6}
              maxLength={12}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              aria-describedby={`${id}-hint`}
            />
            <Button type="submit" variant="blue">
              {t("joinButton")}
              <Icon name="arrow" />
            </Button>
          </div>
          <p id={`${id}-hint`} className="pp-entry-hint">
            {t("roomCodeHint")}
          </p>
        </form>
      </div>
      <DecorativeImage kind="friends" className="pp-entry-art" />
      <span className="pp-entry-track" aria-hidden="true" />
    </section>
  );
}
