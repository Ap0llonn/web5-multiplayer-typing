import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { CreatePage } from "@/composition/play/create-page";
import { getCurrentActor } from "@/modules/identity/server";
import en from "@/shared/presentation/i18n/messages/en.json";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/modules/identity/server", () => ({ getCurrentActor: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => createTranslator({ locale: "en", messages: en }),
}));
vi.mock("@/shared/presentation/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));
beforeEach(() => vi.clearAllMocks());
async function render() {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      {await CreatePage()}
    </NextIntlClientProvider>,
  );
}
it("accounts create only from the dedicated page with settings and characters", async () => {
  vi.mocked(getCurrentActor).mockResolvedValue({
    ok: true,
    value: { kind: "account", playerIdentityId: "host", displayName: "Host" },
  });
  const html = await render();
  expect(html.match(/<form/g)).toHaveLength(1);
  expect(html).toContain('name="name"');
  expect(html).toContain('name="capacity"');
  expect(html).toContain('name="character"');
  expect(html).not.toContain('name="code"');
});
for (const kind of ["guest", "signed-out", "error"] as const) {
  it(`${kind}: no room creation form is exposed`, async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(
      kind === "guest"
        ? {
            ok: true,
            value: {
              kind: "guest",
              playerIdentityId: "guest",
              displayName: "Guest",
            },
          }
        : {
            ok: false,
            error: {
              code: kind === "error" ? "INTERNAL" : "UNAUTHENTICATED",
              messageKey:
                kind === "error" ? "errors.INTERNAL" : "errors.UNAUTHENTICATED",
            },
          },
    );
    const html = await render();
    expect(html).not.toContain("<form");
    if (kind === "error") expect(html).toContain('role="alert"');
    else expect(html).toContain('href="/login"');
  });
}
