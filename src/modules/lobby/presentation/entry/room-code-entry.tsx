"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/presentation/ui/button";
import { Input } from "@/shared/presentation/ui/field";
import { Icon } from "@/shared/presentation/ui/icon";
import { DecorativeImage } from "@/shared/presentation/ui/decorative-image";
import { useRouter } from "@/shared/presentation/i18n/navigation";
import "./room-code-entry.css";
import { roomCodeSchema } from "../../contracts/lobby-schemas";

export function RoomCodeEntry() {
  const router = useRouter();
  const t = useTranslations("play");
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section className="room-code-entry" aria-labelledby={`${id}-title`}>
      <div className="room-code-entry-content">
        <p className="room-code-eyebrow">{t("entryEyebrow")}</p>
        <h1
          ref={heading}
          tabIndex={-1}
          id={`${id}-title`}
          className="room-code-entry-title"
        >
          {t("entryTitle")}
        </h1>
        <p className="room-code-entry-description">{t("entryDescription")}</p>
        <form
          className="room-code-entry-form"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("code");
            const code = roomCodeSchema.safeParse(value);
            if (code.success) router.push(`/play/player?code=${code.data}`);
          }}
        >
          <label className="room-code-field-label" htmlFor={`${id}-room`}>
            {t("roomCodeLabel")}
          </label>
          <div className="room-code-entry-control">
            <Input
              id={`${id}-room`}
              className="room-code-input"
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
          <p id={`${id}-hint`} className="room-code-entry-hint">
            {t("roomCodeHint")}
          </p>
        </form>
      </div>
      <DecorativeImage kind="friends" className="room-code-entry-art" />
      <span className="room-code-entry-track" aria-hidden="true" />
    </section>
  );
}
