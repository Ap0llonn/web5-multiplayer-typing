"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "./button";
import { Icon } from "./icon";

export function ThemeSwitcher() {
  const t = useTranslations();
  const { setTheme } = useTheme();

  return (
    <div className="theme-controls">
      <Button
        variant="paper"
        size="small"
        aria-label={t("light")}
        title={t("light")}
        onClick={() => setTheme("light")}
        className="theme-light"
      >
        <Icon name="sun" />
      </Button>
      <Button
        variant="paper"
        size="small"
        aria-label={t("dark")}
        title={t("dark")}
        onClick={() => setTheme("dark")}
        className="theme-dark"
      >
        <Icon name="moon" />
      </Button>
    </div>
  );
}
