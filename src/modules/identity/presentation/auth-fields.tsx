import { useTranslations } from "next-intl";
import { Field, Input } from "@/shared/presentation/ui/field";

export function GuestNameField() {
  const t = useTranslations();

  return (
    <Field label={t("guestName")}>
      <Input
        name="name"
        minLength={3}
        maxLength={20}
        autoComplete="nickname"
        placeholder={t("guestPlaceholder")}
        required
      />
    </Field>
  );
}

export function CredentialFields({ mode }: { mode: "login" | "signup" }) {
  const t = useTranslations();

  return (
    <>
      <Field label={t("username")}>
        <Input
          name="username"
          minLength={3}
          maxLength={20}
          autoComplete="username"
          required
        />
      </Field>
      {mode === "signup" && (
        <Field label={t("email")}>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
      )}
      <Field label={t("password")}>
        <Input
          name="password"
          type="password"
          minLength={12}
          maxLength={128}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
        />
      </Field>
    </>
  );
}
