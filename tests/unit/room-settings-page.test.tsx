import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { LobbyRoom } from "@/modules/lobby/presentation/room/lobby-room";
import { useLobbyRoom } from "@/modules/lobby/presentation/room/use-lobby-room";
import {
  createRoom,
  joinRoom,
  snapshot,
} from "@/modules/lobby/domain/lobby-rules";
import en from "@/shared/presentation/i18n/messages/en.json";
import fr from "@/shared/presentation/i18n/messages/fr.json";

vi.mock("@/modules/lobby/presentation/room/use-lobby-room", () => ({
  useLobbyRoom: vi.fn(),
}));
vi.mock("@/shared/presentation/i18n/navigation", () => ({
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/play/room",
}));
const actor = {
  kind: "account" as const,
  playerIdentityId: "host",
  displayName: "Host",
};
function fixture() {
  const created = createRoom(
    { name: "Room", capacity: 3, role: "PARTICIPANT" },
    actor,
    "ABC234",
    0,
  );
  if (!created.ok) throw Error();
  joinRoom(
    created.value,
    { kind: "guest", playerIdentityId: "guest", displayName: "Guest" },
    "PARTICIPANT",
    0,
  );
  return snapshot(created.value, 0, "host");
}
beforeEach(() => {
  const room = fixture();
  vi.mocked(useLobbyRoom).mockReturnValue({
    room,
    loaded: true,
    pending: false,
    connection: "connected",
    messageKey: "",
    send: async () => ({ ok: true, value: room }),
    acceptSnapshot: vi.fn(),
  });
});
for (const [locale, messages] of [
  ["fr", fr],
  ["en", en],
] as const) {
  function render(
    configuration = false,
    kind: "account" | "guest" = "account",
  ) {
    return renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
      >
        <LobbyRoom
          actor={{
            ...actor,
            kind,
            playerIdentityId: kind === "guest" ? "guest" : "host",
          }}
          configuration={configuration}
        />
      </NextIntlClientProvider>,
    );
  }
  it(`${locale}: hides the settings form and keeps the gear link and race start in the room`, () => {
    const html = render();
    expect(html).not.toContain('name="wordCount"');
    expect(html).not.toContain("<form");
    expect(html).toContain('href="/play/room/settings"');
    expect(html).toContain(messages.race.start);
    expect(html).toContain('data-testid="room-code"');
  });
  it(`${locale}: the configuration page edits settings with a return link and no start button`, () => {
    const html = render(true);
    expect(html).toContain('name="wordCount"');
    expect(html).toContain('href="/play/room"');
    expect(html).not.toContain(messages.race.start);
    expect(html).not.toContain('data-testid="room-code"');
  });
  it(`${locale}: a guest sees the shared configuration without editing controls`, () => {
    const html = render(true, "guest");
    expect(html).not.toContain("<form");
    expect(html).toContain(messages.race.settings);
  });
}
