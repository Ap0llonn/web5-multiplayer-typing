"use client";
import { useTranslations } from "next-intl";
import type { LobbyRole } from "../../public";

export function LobbyRolePicker({
  role,
  onChange,
  disabled,
}: {
  role: LobbyRole;
  onChange: (role: LobbyRole) => void;
  disabled: boolean;
}) {
  const t = useTranslations();
  return (
    <fieldset disabled={disabled} className="grid gap-3">
      <legend className="mb-2 font-bold">{t("role")}</legend>
      <div className="flex flex-wrap gap-4">
        {(["PARTICIPANT", "SPECTATOR"] as const).map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-[var(--border)] px-4 py-3 font-bold"
          >
            <input
              type="radio"
              name="role"
              value={option}
              checked={role === option}
              onChange={() => onChange(option)}
              className="h-4 w-4 accent-[var(--ink)]"
            />
            {t(option)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
