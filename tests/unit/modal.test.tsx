import React from "react";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Modal } from "@/shared/presentation/ui/modal";
it("closed modals expose no confirmation content", () => {
  expect(
    renderToStaticMarkup(
      <Modal open={false} title="Delete" onClose={() => {}}>
        <button>Confirm</button>
      </Modal>,
    ),
  ).toBe("");
});
it("multiple instances have distinct accessible names and descriptions", () => {
  const html = renderToStaticMarkup(
    <>
      <Modal
        open
        title="First"
        description="First description"
        onClose={() => {}}
      >
        <button>Cancel</button>
      </Modal>
      <Modal
        open
        title="Second"
        description="Second description"
        onClose={() => {}}
      >
        <button>Cancel</button>
      </Modal>
    </>,
  );
  const titles = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map(
    (match) => match[1],
  );
  const descriptions = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map(
    (match) => match[1],
  );
  expect(new Set(titles).size).toBe(2);
  expect(new Set(descriptions).size).toBe(2);
  for (const id of [...titles, ...descriptions])
    expect(html).toContain(`id="${id}"`);
});
