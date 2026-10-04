import React from "react";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { runInNewContext } from "node:vm";
import { Theme } from "@/shared/presentation/theme/provider";

for (const [saved, systemDark, expected] of [
  [null, true, "dark"],
  ["light", true, "light"],
  ["dark", false, "dark"],
] as const) {
  it(`applies ${expected} before hydration with saved preference ${saved} and system dark ${systemDark}`, () => {
    const html = renderToStaticMarkup(
      <Theme>
        <p>Content</p>
      </Theme>,
    );
    const classes = new Set<string>();
    const style = { colorScheme: "" };
    for (const [, attributes, content] of html.matchAll(
      /<script([^>]*)>(.*?)<\/script>/gs,
    )) {
      // Browsers execute the SSR bootstrap only when its type is executable.
      const type = /type="([^"]+)"/.exec(attributes)?.[1];
      if (type && type !== "text/javascript") continue;
      runInNewContext(content, {
        document: {
          documentElement: {
            classList: {
              remove: (...names: string[]) =>
                names.forEach((name) => classes.delete(name)),
              add: (name: string) => classes.add(name),
            },
            style,
          },
        },
        window: { matchMedia: () => ({ matches: systemDark }) },
        localStorage: { getItem: () => saved },
      });
    }
    expect([...classes]).toEqual([expected]);
    expect(style.colorScheme).toBe(expected);
  });
}
