"use client";
import { useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";

function followCursor(box: HTMLParagraphElement) {
  const cursor =
    box.querySelector<HTMLElement>('[data-cursor="true"]') ??
    box.lastElementChild;
  if (!cursor) return;
  const line = cursor.getBoundingClientRect();
  const viewport = box.getBoundingClientRect();
  if (line.top < viewport.top + 12 || line.bottom > viewport.bottom - 12) {
    const style = getComputedStyle(box);
    const lineHeight = parseFloat(style.lineHeight);
    const padding = parseFloat(style.paddingTop);
    const cursorLine = Math.floor(
      (box.scrollTop + line.top - viewport.top - padding) / lineHeight,
    );
    // Keep complete lines in the window, with the current line after its context.
    box.scrollTop = Math.max(0, cursorLine - 1) * lineHeight;
  }
}

export function RacePassage({
  text,
  draft,
  language,
  fog,
}: {
  text: string;
  draft: string;
  language: "fr" | "en";
  fog: boolean;
}) {
  const t = useTranslations("race");
  const passage = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const box = passage.current;
    if (box) followCursor(box);
  }, [draft.length, text]);
  useLayoutEffect(() => {
    const box = passage.current;
    if (!box) return;
    const observer = new ResizeObserver(() => followCursor(box));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  const currentWordEnd = text.indexOf(" ", draft.length);
  return (
    <p
      ref={passage}
      className="race-passage"
      tabIndex={0}
      role="region"
      data-testid="race-text"
      lang={language}
      aria-label={t("text")}
    >
      {[...text].map((character, index) => {
        const hidden =
          fog &&
          currentWordEnd !== -1 &&
          index > currentWordEnd &&
          character !== " ";
        return (
          <span
            key={index}
            data-state={
              index < draft.length
                ? draft[index] === character
                  ? "correct"
                  : "incorrect"
                : "waiting"
            }
            data-cursor={index === draft.length}
            data-fogged={hidden}
          >
            {hidden ? "•" : character}
          </span>
        );
      })}
    </p>
  );
}
