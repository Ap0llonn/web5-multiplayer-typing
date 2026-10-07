import React from "react";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Icon } from "@/shared/presentation/ui/icon";

it("renders the shared UI icons through Lucide instead of bespoke SVGs", () => {
  const names = [
    "arrow",
    "enter",
    "plus",
    "eye",
    "people",
    "check",
    "sun",
    "moon",
    "globe",
    "chevron",
    "user",
    "spark",
  ] as const;
  for (const name of names) {
    const html = renderToStaticMarkup(<Icon name={name} />);
    expect(html, name).toMatch(/class="[^"]*\blucide\b/);
    expect(html, name).toContain('aria-hidden="true"');
    expect(html, name).toContain('focusable="false"');
    expect(html, name).toContain("h-5 w-5 shrink-0");
    expect(html, name).toContain('stroke="currentColor"');
  }
});

it("preserves caller styling and SVG properties", () => {
  const html = renderToStaticMarkup(
    <Icon
      name="globe"
      className="h-8 w-8 text-accent"
      strokeWidth={3}
      data-testid="language-icon"
    />,
  );
  expect(html).toContain("h-8 w-8 text-accent");
  expect(html).toContain('stroke-width="3"');
  expect(html).toContain('data-testid="language-icon"');
});
