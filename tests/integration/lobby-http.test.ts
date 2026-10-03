import { it, expect } from "vitest";
import { handleLobbyCommand } from "@/composition/lobby/http";
it("rejects unauthenticated and cross-origin room creation", async () => {
  const make = (origin: string) =>
    new Request("http://localhost:3000/api/lobbies", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({
        name: "X",
        capacity: 2,
        role: "PARTICIPANT",
        playerIdentityId: "spoof",
      }),
    });
  expect(
    (await handleLobbyCommand(make("http://localhost:3000"), "create")).status,
  ).toBe(401);
  expect(
    (await handleLobbyCommand(make("https://evil.example"), "create")).status,
  ).toBe(403);
});
