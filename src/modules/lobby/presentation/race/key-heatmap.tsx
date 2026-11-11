"use client";

import { useId, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { KeyStatistic } from "../../public";

const keyboardRows = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm", " "];

export function KeyHeatmap({
  statistics,
  races,
}: {
  statistics: KeyStatistic[];
  races: number;
}) {
  const t = useTranslations("heatmap");
  const format = useFormatter();
  const id = useId();
  const [mode, setMode] = useState<"errors" | "frequency">("errors");
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(1, ...statistics.map((entry) => entry.total));
  const extra = statistics
    .filter((entry) => !keyboardRows.some((row) => row.includes(entry.key)))
    .map((entry) => entry.key);
  const rows = [
    ...keyboardRows.map((row) => [...row]),
    ...(extra.length ? [extra] : []),
  ];
  function label(key: string) {
    return key === " " ? t("space") : key;
  }
  function detail(key: string) {
    const entry = statistics.find((statistic) => statistic.key === key);
    return entry?.total
      ? t("detail", {
          key: label(key),
          total: format.number(entry.total),
          errors: format.number(entry.errors),
          accuracy: format.number(1 - entry.errors / entry.total, {
            style: "percent",
            maximumFractionDigits: 1,
          }),
        })
      : t("noKeyData", { key: label(key) });
  }
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id={`${id}-title`} className="text-xl font-black">
          {t("title")}
        </h2>
        <div className="grid gap-1 text-sm font-bold">
          <label htmlFor={`${id}-mode`}>{t("mode")}</label>
          <select
            id={`${id}-mode`}
            value={mode}
            onChange={(event) =>
              setMode(
                event.target.value === "frequency" ? "frequency" : "errors",
              )
            }
            className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
          >
            <option value="errors">{t("errors")}</option>
            <option value="frequency">{t("frequency")}</option>
          </select>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">{t("description")}</p>
      <p className="mt-2 text-sm text-muted">
        {t("coverage", { count: races })}
      </p>
      {!statistics.some((entry) => entry.total > 0) && (
        <p className="mt-4 text-sm" role="status">
          {t("empty")}
        </p>
      )}
      <p className="mt-4 text-sm font-bold">
        {mode === "errors" ? t("errorLegend") : t("frequencyLegend")}
      </p>
      <div
        role="group"
        className="mt-4 grid min-w-0 gap-2"
        aria-label={t("keyboard")}
      >
        {rows.map((row, index) => (
          <div
            key={index}
            className={`flex min-w-0 justify-center gap-1 sm:gap-2 ${index >= keyboardRows.length ? "flex-wrap" : ""}`}
          >
            {row.map((key) => {
              const entry = statistics.find(
                (statistic) => statistic.key === key,
              );
              const intensity = entry?.total
                ? mode === "errors"
                  ? entry.errors / entry.total
                  : entry.total / max
                : 0;
              return (
                <button
                  key={key}
                  type="button"
                  title={detail(key)}
                  aria-label={detail(key)}
                  aria-pressed={selected === key}
                  onClick={() => setSelected(key)}
                  onFocus={() => setSelected(key)}
                  onMouseEnter={() => setSelected(key)}
                  className={`${key === " " ? "w-40" : index >= keyboardRows.length ? "w-8 shrink-0 sm:w-10" : "min-w-0 max-w-10 flex-1"} min-h-11 rounded-lg border border-[var(--border)] text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${selected === key ? "ring-2 ring-[var(--accent)]" : ""}`}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${mode === "errors" ? "#e45b46" : "#508eda"} ${Math.round(intensity * 40)}%, var(--panel))`,
                  }}
                >
                  {label(key)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p
        className="mt-4 min-h-12 text-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {selected === null ? t("inspect") : detail(selected)}
      </p>
    </section>
  );
}
