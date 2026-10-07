"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/shared/presentation/i18n/navigation";
import { Button } from "@/shared/presentation/ui/button";
import { Field, Input } from "@/shared/presentation/ui/field";
import { Icon } from "@/shared/presentation/ui/icon";
import type { OperationResult } from "@/shared/contracts/operation-result";
import type { Profile } from "../../contracts/profile";
import { MAX_PROFILE_PHOTO_BYTES } from "../../contracts/profile";

export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations();
  const router = useRouter();
  const lock = useRef(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [photoName, setPhotoName] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    const photo = form.get("photo");
    setSaved(false);
    setError("");
    if (photo instanceof File && photo.size > MAX_PROFILE_PHOTO_BYTES) {
      setError("profile.photoError");
      return;
    }
    if (photo instanceof File && photo.size === 0) form.delete("photo");
    lock.current = true;
    setPending(true);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        body: form,
      });
      const result: OperationResult<Profile> = await response.json();
      if (!result.ok) {
        setError(
          result.error.code === "VALIDATION"
            ? "profile.validationError"
            : result.error.messageKey,
        );
        return;
      }
      const input = element.elements.namedItem("photo");
      if (input instanceof HTMLInputElement) input.value = "";
      const nameInput = element.elements.namedItem("displayName");
      if (nameInput instanceof HTMLInputElement)
        nameInput.value = result.value.displayName;
      setPhotoName("");
      setSaved(true);
      router.refresh();
    } catch {
      setError("errors.INTERNAL");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-5"
      aria-labelledby="profile-edit-title"
      onChange={() => {
        setSaved(false);
        setError("");
      }}
    >
      <fieldset disabled={pending} className="grid min-w-0 gap-5">
        <legend className="sr-only">{t("profile.editTitle")}</legend>
        <Field label={t("profile.displayName")}>
          <Input
            name="displayName"
            defaultValue={profile.displayName}
            minLength={3}
            maxLength={20}
            required
            autoComplete="nickname"
            aria-describedby="profile-name-hint"
          />
        </Field>
        <p id="profile-name-hint" className="-mt-3 text-sm text-muted">
          {t("profile.nameHint")}
        </p>
        <div className="grid min-w-0 gap-2">
          <label htmlFor="profile-photo" className="text-sm font-extrabold">
            {t("profile.photo")}
          </label>
          <input
            id="profile-photo"
            ref={photoInput}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="profile-photo-hint"
            hidden
            onChange={(event) =>
              setPhotoName(event.currentTarget.files?.[0]?.name ?? "")
            }
          />
          <Button
            variant="paper"
            size="small"
            onClick={() => photoInput.current?.click()}
            className="w-full sm:w-fit"
          >
            <Icon name="user" />
            {t("profile.choosePhoto")}
          </Button>
          <p className="min-w-0 text-sm break-all text-muted">
            {photoName || t("profile.noPhotoSelected")}
          </p>
        </div>
        <p id="profile-photo-hint" className="-mt-3 text-sm text-muted">
          {t("profile.photoHint")}
        </p>
      </fieldset>
      {error && <p role="alert">{t(error)}</p>}
      <p role="status" className={saved ? "text-sm font-bold" : "sr-only"}>
        {saved ? t("profile.saved") : ""}
      </p>
      <Button
        type="submit"
        variant="blue"
        disabled={pending}
        className="w-full sm:w-fit"
      >
        {pending ? t("pending") : t("profile.save")}
        <Icon name="check" />
      </Button>
    </form>
  );
}
