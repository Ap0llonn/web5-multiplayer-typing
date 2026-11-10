"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { LobbySnapshot, RaceSettings } from "../../public";
import type { OperationResult } from "@/shared/contracts/operation-result";
import { Button } from "@/shared/presentation/ui/button";
import { Field, Input } from "@/shared/presentation/ui/field";
import { Card } from "@/shared/presentation/ui/card";
import { Dropdown } from "@/shared/presentation/ui/dropdown";

export function RaceSettingsPanel({
  room,
  isHost,
  pending,
  send,
}: {
  room: LobbySnapshot;
  isHost: boolean;
  pending: boolean;
  send: (
    path: string,
    body: unknown,
  ) => Promise<OperationResult<LobbySnapshot>>;
}) {
  const t = useTranslations("race");
  const settings = room.raceSettings ?? {
    language: "fr",
    wordCount: 30,
    durationSeconds: 120,
    correction: "required",
  };
  const [unlimited, setUnlimited] = useState(settings.durationSeconds === null);
  const [mode, setMode] = useState(settings.mode ?? "coherent");
  const [bots, setBots] = useState<NonNullable<RaceSettings["bots"]>>(
    settings.bots ?? [],
  );
  const humans = room.members.filter((m) => m.role === "PARTICIPANT").length;
  const flags = [
    "punctuation",
    "numbers",
    "uppercase",
    "accents",
    "bonuses",
  ] as const;
  const savedBots = settings.bots ?? [];
  return (
    <Card>
      <h2 className="text-2xl font-black">{t("settings")}</h2>
      <p className="mt-2 text-muted" role="status">
        {t("summary", {
          language: t(settings.language),
          words: settings.wordCount,
          mode: t(settings.correction),
        })}
        {" · "}
        {settings.durationSeconds === null
          ? t("unlimited")
          : t("seconds", { count: settings.durationSeconds })}
        {" · "}
        {t(settings.bonuses === false ? "items.disabled" : "items.enabled")}
      </p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-bold">{t("textMode")}</dt>
          <dd>
            {t(settings.mode ?? "coherent")} ·{" "}
            {t(settings.complexity ?? "medium")}
          </dd>
        </div>
        <div>
          <dt className="font-bold">{t("roomOptions")}</dt>
          <dd>
            {t(room.visibility)} ·{" "}
            {t("capacityValue", { count: room.capacity })}
          </dd>
        </div>
        <div>
          <dt className="font-bold">{t("characterOptions")}</dt>
          <dd>
            {flags
              .map(
                (flag) =>
                  `${t(flag === "bonuses" ? "items.enable" : flag)}: ${t(settings[flag] === false ? "off" : "on")}`,
              )
              .join(" · ")}
          </dd>
        </div>
        <div>
          <dt className="font-bold">{t("bots")}</dt>
          <dd>
            {savedBots.length
              ? savedBots
                  .map(
                    (b, i) =>
                      `${t("botName", { number: i + 1 })}: ${t("botLevel", { level: b.level })}`,
                  )
                  .join(" · ")
              : t("noBots")}
          </dd>
        </div>
        {settings.mode === "random" && (
          <div>
            <dt className="font-bold">{t("characterFilters")}</dt>
            <dd>
              {t("includeCharacters")}:{" "}
              {settings.includeCharacters || t("none")} ·{" "}
              {t("excludeCharacters")}:{" "}
              {settings.excludeCharacters || t("none")}
            </dd>
          </div>
        )}
      </dl>
      {isHost ? (
        <>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void send(`/api/lobbies/${room.code}/race/configure`, {
                language: data.get("language"),
                wordCount: Number(data.get("wordCount")),
                durationSeconds: unlimited
                  ? null
                  : Number(data.get("durationSeconds")),
                correction: data.get("correction"),
                mode,
                complexity: data.get("complexity"),
                ...Object.fromEntries(
                  flags.map((flag) => [flag, data.get(flag) === "on"]),
                ),
                includeCharacters:
                  mode === "random" ? data.get("includeCharacters") : "",
                excludeCharacters:
                  mode === "random" ? data.get("excludeCharacters") : "",
                bots,
                capacity: Number(data.get("capacity")),
                visibility: data.get("visibility"),
              });
            }}
          >
            <Dropdown
              name="language"
              label={t("language")}
              defaultValue={settings.language}
              disabled={pending}
              options={[
                { value: "fr", label: t("fr") },
                { value: "en", label: t("en") },
              ]}
            />
            <Field label={t("words")}>
              <Input
                name="wordCount"
                type="number"
                min={10}
                max={100}
                defaultValue={settings.wordCount}
                required
                disabled={pending}
              />
            </Field>
            <Dropdown
              name="mode"
              label={t("textMode")}
              value={mode}
              disabled={pending}
              onValueChange={(value) =>
                setMode(value === "random" ? "random" : "coherent")
              }
              options={[
                { value: "coherent", label: t("coherent") },
                { value: "random", label: t("random") },
              ]}
            />
            <Dropdown
              name="complexity"
              label={t("complexity")}
              defaultValue={settings.complexity ?? "medium"}
              disabled={pending}
              options={[
                { value: "easy", label: t("easy") },
                { value: "medium", label: t("medium") },
                { value: "hard", label: t("hard") },
              ]}
            />
            <p className="text-sm text-muted sm:col-span-2">
              {t(mode === "random" ? "randomDifficulty" : "coherentDifficulty")}
            </p>
            <Dropdown
              name="correction"
              label={t("correction")}
              defaultValue={settings.correction}
              disabled={pending}
              options={[
                { value: "required", label: t("required") },
                { value: "free", label: t("free") },
              ]}
            />
            <Field label={t("duration")}>
              <Input
                name="durationSeconds"
                type="number"
                min={30}
                max={600}
                defaultValue={settings.durationSeconds ?? 120}
                disabled={unlimited || pending}
                required={!unlimited}
              />
            </Field>
            <label className="flex items-center gap-3 font-bold">
              <input
                type="checkbox"
                checked={unlimited}
                disabled={pending}
                onChange={(e) => setUnlimited(e.target.checked)}
              />
              {t("unlimited")}
            </label>
            <fieldset
              className="grid gap-3 sm:col-span-2 sm:grid-cols-2"
              disabled={pending}
            >
              <legend className="mb-3 font-black">
                {t("characterOptions")}
              </legend>
              {flags.map((flag) => (
                <label key={flag} className="flex items-center gap-3 font-bold">
                  <input
                    type="checkbox"
                    name={flag}
                    defaultChecked={settings[flag] !== false}
                  />
                  {t(flag === "bonuses" ? "items.enable" : flag)}
                </label>
              ))}
            </fieldset>
            <Field label={t("includeCharacters")}>
              <Input
                name="includeCharacters"
                maxLength={40}
                defaultValue={settings.includeCharacters ?? ""}
                disabled={pending || mode !== "random"}
              />
            </Field>
            <Field label={t("excludeCharacters")}>
              <Input
                name="excludeCharacters"
                maxLength={40}
                defaultValue={settings.excludeCharacters ?? ""}
                disabled={pending || mode !== "random"}
              />
            </Field>
            <p className="text-sm text-muted sm:col-span-2">
              {t(mode === "random" ? "filtersHint" : "coherentFilters")}
            </p>
            <Dropdown
              name="visibility"
              label={t("visibility")}
              defaultValue={room.visibility}
              disabled={pending}
              options={[
                { value: "CODE", label: t("CODE") },
                { value: "PUBLIC", label: t("PUBLIC") },
              ]}
            />
            <Field label={t("capacity")}>
              <Input
                name="capacity"
                type="number"
                min={Math.max(2, humans + bots.length)}
                max={30}
                defaultValue={room.capacity}
                required
                disabled={pending}
              />
            </Field>
            <fieldset
              className="grid min-w-0 gap-3 sm:col-span-2"
              disabled={pending}
            >
              <legend className="mb-3 font-black">{t("bots")}</legend>
              <p className="text-sm text-muted">{t("botsHint")}</p>
              {bots.map((bot, index) => (
                <div className="flex flex-wrap items-end gap-3" key={bot.id}>
                  <Dropdown
                    label={t("botName", { number: index + 1 })}
                    value={String(bot.level)}
                    disabled={pending}
                    onValueChange={(value) => {
                      const level = Number(value);
                      if (
                        level === 1 ||
                        level === 2 ||
                        level === 3 ||
                        level === 4 ||
                        level === 5
                      )
                        setBots(
                          bots.map((b) =>
                            b.id === bot.id ? { ...b, level } : b,
                          ),
                        );
                    }}
                    options={[
                      { value: "1", label: t("botLevel", { level: 1 }) },
                      { value: "2", label: t("botLevel", { level: 2 }) },
                      { value: "3", label: t("botLevel", { level: 3 }) },
                      { value: "4", label: t("botLevel", { level: 4 }) },
                      { value: "5", label: t("botLevel", { level: 5 }) },
                    ]}
                  />
                  <Button
                    variant="paper"
                    type="button"
                    onClick={() => setBots(bots.filter((b) => b.id !== bot.id))}
                    aria-label={t("removeBot", { number: index + 1 })}
                  >
                    {t("remove")}
                  </Button>
                </div>
              ))}
              <Button
                variant="paper"
                type="button"
                disabled={
                  pending || bots.length >= 29 || bots.length + humans >= 30
                }
                onClick={() =>
                  setBots([...bots, { id: crypto.randomUUID(), level: 3 }])
                }
              >
                {t("addBot")}
              </Button>
            </fieldset>
            <p className="text-sm text-muted sm:col-span-2">{t("saveHint")}</p>
            <Button type="submit" variant="paper" disabled={pending}>
              {t("save")}
            </Button>
          </form>
        </>
      ) : (
        <p className="mt-4 font-bold" role="status">
          {t("waitingHost")}
        </p>
      )}
    </Card>
  );
}
