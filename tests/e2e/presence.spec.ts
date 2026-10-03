import { expect, test } from "@playwright/test";

test("participant and host reconnect within the grace period with unchanged identities and roster", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const host = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "192.0.2.231" },
  });
  const guest = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "192.0.2.232" },
  });
  try {
    const username = `presence${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
    const signup = await host.request.post("/api/auth/sign-up/email", {
      headers: { origin: "http://localhost:3000" },
      data: {
        name: username,
        username,
        email: `${username}@example.test`,
        password: "test-password-123",
      },
    });
    expect(signup.status()).toBe(200);
    const h = await host.newPage();
    const g = await guest.newPage();
    await h.goto("/en");
    await h.getByLabel("Room name").fill("Presence test");
    await h.getByRole("button", { name: "Create room", exact: true }).click();
    await expect(h.getByTestId("room-code")).toBeVisible();
    const code = await h.getByTestId("room-code").innerText();
    await g.goto("/en");
    await g.getByLabel("Guest nickname").fill("Presence Guest");
    await g.getByRole("button", { name: "Continue as guest" }).click();
    await expect(g.getByLabel("Room code")).toBeVisible();
    await g.getByLabel("Room code").fill(code);
    const arrivalStarted = Date.now();
    await g.getByRole("button", { name: "Join room", exact: true }).click();
    await expect(h.getByTestId("member-row")).toHaveCount(2);
    const arrivalMs = Date.now() - arrivalStarted;
    const timings: Record<
      string,
      { offlineDetectedMs: number; reconnectedMs: number }
    > = {};
    const hostRow = g.getByTestId("member-row").filter({ hasText: username });
    const guestRow = h
      .getByTestId("member-row")
      .filter({ hasText: "Presence Guest" });
    await expect(hostRow.getByTestId("member-kind")).toHaveText("Account");
    await expect(hostRow).toContainText("Host");
    await expect(guestRow.getByTestId("member-kind")).toHaveText("Guest");
    const before = await (await host.request.get("/api/lobbies/me")).json();
    expect(before).toMatchObject({ ok: true, value: { code } });
    const membersBefore = before.value.members
      .map((member: { playerIdentityId: string }) => member.playerIdentityId)
      .sort();
    const ownerBefore = before.value.hostPlayerIdentityId;
    for (const [kind, offlineContext, offlinePage, peer, peerRow] of [
      ["guest", guest, g, h, guestRow],
      ["host", host, h, g, hostRow],
    ] as const) {
      const lostAt = Date.now();
      await offlineContext.setOffline(true);
      // Wait for a real stale-presence observation, not an arbitrary sleep or a mocked event.
      await expect(peerRow).toContainText("Reconnecting", { timeout: 20000 });
      await expect(peer.getByTestId("room-code")).toHaveText(code);
      await expect(peer.getByTestId("member-row")).toHaveCount(2);
      const offlineDetectedMs = Date.now() - lostAt;
      expect(offlineDetectedMs).toBeLessThan(25000);
      await offlineContext.setOffline(false);
      await expect(peerRow).toContainText("Online", { timeout: 10000 });
      await expect(offlinePage.getByTestId("room-code")).toHaveText(code);
      await expect(offlinePage.getByTestId("member-row")).toHaveCount(2);
      const reconnectedMs = Date.now() - lostAt;
      expect(reconnectedMs).toBeLessThan(30000);
      timings[kind] = { offlineDetectedMs, reconnectedMs };
      const after = await (await host.request.get("/api/lobbies/me")).json();
      expect(after).toMatchObject({
        ok: true,
        value: { code, hostPlayerIdentityId: ownerBefore },
      });
      expect(
        after.value.members
          .map(
            (member: { playerIdentityId: string }) => member.playerIdentityId,
          )
          .sort(),
      ).toEqual(membersBefore);
    }
    console.log(
      "Presence timing evidence (Chromium, localhost, milliseconds):",
      JSON.stringify({ arrivalMs, ...timings }),
    );
    await h.getByRole("button", { name: "Français", exact: true }).click();
    await expect(h).toHaveURL(/\/fr\/?$/);
    await expect(
      h.getByTestId("member-row").filter({ hasText: username }),
    ).toContainText("Compte");
    await expect(
      h.getByTestId("member-row").filter({ hasText: "Presence Guest" }),
    ).toContainText("Invité");
    await expect(h.getByTestId("member-row")).toHaveCount(2);
  } finally {
    await host.close();
    await guest.close();
  }
});
