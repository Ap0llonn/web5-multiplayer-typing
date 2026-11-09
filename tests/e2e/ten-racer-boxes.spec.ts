import { expect, test, type APIRequestContext } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { raceStateSchema } from "../../src/modules/lobby/contracts/race-schemas";
import { distributeMysteryBoxes } from "../../src/modules/lobby/domain/race-bonuses";
import { raceMetrics } from "../../src/modules/lobby/domain/race-rules";
import type { LobbySnapshot } from "../../src/modules/lobby/public";
import type { OperationResult } from "../../src/shared/contracts/operation-result";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };

test.use({ trace: "off" });
function testDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw Error(
      "Run through pnpm test:browser (disposable PostgreSQL required).",
    );
  const target = new URL(connectionString);
  if (
    !["localhost", "127.0.0.1"].includes(target.hostname) ||
    target.pathname !== "/typing_test" ||
    target.port !== "55432"
  )
    throw Error(
      "The ten-racer fixture only supports the disposable typing_test database.",
    );
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
async function snapshot(request: APIRequestContext) {
  const response: OperationResult<LobbySnapshot | null> = await (
    await request.get("/api/lobbies/me")
  ).json();
  if (!response.ok || !response.value?.race)
    throw Error("Missing live race snapshot");
  return response.value.race;
}

// Select a reproducible random seed before the countdown ends, without changing
// any live progress, text, inventory, metrics, bot settings or timestamps.
async function seedFirstCatchup(
  db: PrismaClient,
  code: string,
  humanId: string,
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Lobby" WHERE code=${code} FOR UPDATE`;
    const row = await tx.lobby.findUniqueOrThrow({ where: { code } });
    const race = raceStateSchema.parse(row.race);
    if (Date.now() >= race.startsAt)
      throw Error("Seed must be selected during the countdown.");
    let selected: string | undefined;
    for (let index = 0; index < 64; index++) {
      const probe = structuredClone(race);
      probe.id = `ten-racer-replay-${index}`;
      probe.players.forEach((p, i) => {
        p.progress = Math.ceil(
          p.text.length *
            (p.playerIdentityId === humanId ? 0.25 : 0.95 - i * 0.04),
        );
        p.draft = p.text.slice(0, p.progress);
      });
      const fogged = structuredClone(probe);
      const leader = [...fogged.players].sort(
        (a, b) => b.progress - a.progress,
      )[0];
      leader.fogUntil = probe.startsAt + 10000;
      const drawsCatchup = [probe, fogged].every((variant) => {
        distributeMysteryBoxes(variant, variant.startsAt + 1);
        return (
          variant.players.find((p) => p.playerIdentityId === humanId)?.items[0]
            ?.type === "catchup"
        );
      });
      if (drawsCatchup) {
        selected = probe.id;
        break;
      }
    }
    if (!selected)
      throw Error("Could not select a reproducible catch-up draw.");
    race.id = selected;
    await tx.lobby.update({
      where: { id: row.id },
      data: {
        version: { increment: 1 },
        race: {
          ...race,
          settings: { ...race.settings },
          players: race.players.map((p) => ({
            ...p,
            samples: p.samples.map((s) => ({ ...s })),
          })),
        },
      },
    });
    return selected;
  });
}

test("ten live racers collect personal boxes and the last human catches up toward fifth", async ({
  browser,
}, testInfo) => {
  test.setTimeout(210000);
  const db = testDatabase();
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "192.0.2.176" },
  });
  const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  let code: string | undefined;
  try {
    const username = `ten${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
    expect(
      (
        await context.request.post("/api/auth/sign-up/email", {
          headers: { origin },
          data: {
            name: "Human Racer",
            username,
            email: `${username}@example.test`,
            password: "test-password-123",
          },
        })
      ).ok(),
    ).toBe(true);
    const created: OperationResult<LobbySnapshot> = await (
      await context.request.post("/api/lobbies", {
        headers: { origin },
        data: {
          name: "Ten-racer box verification",
          capacity: 10,
          role: "PARTICIPANT",
        },
      })
    ).json();
    if (!created.ok) throw Error("Room creation failed");
    code = created.value.code;
    const humanId = created.value.hostPlayerIdentityId;
    const command = (name: string, data: unknown) =>
      context.request.post(`/api/lobbies/${code}/race/${name}`, {
        headers: { origin },
        data,
      });
    expect(
      (
        await command("configure", {
          language: "en",
          mode: "random",
          complexity: "easy",
          wordCount: 100,
          durationSeconds: 180,
          correction: "free",
          bonuses: true,
          punctuation: false,
          numbers: false,
          uppercase: false,
          accents: false,
          capacity: 10,
          bots: ([5, 5, 4, 4, 3, 3, 3, 3, 3] as const).map((level, index) => ({
            id: `racer-${index + 1}`,
            level,
          })),
        })
      ).ok(),
    ).toBe(true);
    const page = await context.newPage();
    await page.goto("/en/play/room");
    await page
      .getByRole("button", { name: en.race.start, exact: true })
      .click();
    await expect(page.getByTestId("race-countdown")).toBeVisible();
    expect((await snapshot(context.request)).players).toHaveLength(10);
    const seed = await seedFirstCatchup(db, code, humanId);
    await expect
      .poll(async () => (await snapshot(context.request)).id)
      .toBe(seed);
    await expect(page.locator(".race-lane")).toHaveCount(10);
    await expect
      .poll(
        async () => {
          const current = await snapshot(context.request);
          expect(
            current.players.find((p) => p.playerIdentityId === humanId)
              ?.boxCheckpoints,
          ).toEqual([]);
          expect(current.self?.items).toEqual([]);
          return current.players.filter(
            (p) => p.kind === "bot" && p.boxCheckpoints?.includes(25),
          ).length;
        },
        { timeout: 90000, intervals: [1000] },
      )
      .toBe(9);
    const beforeTyping = await snapshot(context.request);
    expect(
      beforeTyping.players.find((p) => p.playerIdentityId === humanId)?.rank,
    ).toBe(10);
    const capture = page.getByRole("textbox", {
      name: en.race.typingArea,
      exact: true,
    });
    const crossing = Math.ceil(beforeTyping.text.length / 4);
    const layout = async () => ({
      track: await page.locator(".race-track").boundingBox(),
      ownLane: await page
        .locator('.race-lane[data-local="true"]')
        .boundingBox(),
      typing: await page.locator(".race-input-surface").boundingBox(),
    });
    const initialLayout = await layout();
    await capture.pressSequentially(beforeTyping.text.slice(0, crossing - 1), {
      delay: 80,
    });
    await expect
      .poll(async () => (await snapshot(context.request)).self?.draft.length)
      .toBe(crossing - 1);
    const before = await snapshot(context.request);
    const beforeSelf = before.players.find(
      (p) => p.playerIdentityId === humanId,
    );
    expect(beforeSelf?.rank).toBe(10);
    const storedBefore = raceStateSchema
      .parse((await db.lobby.findUniqueOrThrow({ where: { code } })).race)
      .players.find((p) => p.playerIdentityId === humanId);
    if (!storedBefore) throw Error("Human racer missing");
    const responsePromise = page.waitForResponse(async (response) => {
      if (
        !response.url().endsWith(`/api/lobbies/${code}/race/progress`) ||
        response.request().method() !== "POST"
      )
        return false;
      const result: OperationResult<LobbySnapshot> = await response.json();
      return (
        result.ok &&
        !!result.value.race?.events.some(
          (event) =>
            event.actorId === humanId &&
            event.type === "catchup" &&
            event.outcome === "applied",
        )
      );
    });
    await capture.pressSequentially(beforeTyping.text[crossing - 1]);
    const activated: OperationResult<LobbySnapshot> = await (
      await responsePromise
    ).json();
    if (!activated.ok || !activated.value.race)
      throw Error("Automatic catch-up missing");
    const after = activated.value.race;
    const receipt = after.events.find(
      (event) =>
        event.actorId === humanId &&
        event.outcome === "received" &&
        event.type === "catchup",
    );
    const applied = after.events.find(
      (event) => event.id === receipt?.id.replace(":received", ":used"),
    );
    expect(applied?.at).toBe(receipt?.at);
    const receipts = after.events.filter(
      (event) => event.outcome === "received" && event.id.startsWith("25:"),
    );
    expect(receipts).toHaveLength(10);
    expect(new Set(receipts.map((event) => event.targetId)).size).toBe(10);
    for (const event of receipts) expect(event.actorId).toBe(event.targetId);
    await expect(capture).toBeFocused();
    expect(await layout()).toEqual(initialLayout);
    await expect(page.locator("[data-item]")).toHaveCount(0);
    const afterSelf = after.players.find((p) => p.playerIdentityId === humanId);
    expect(afterSelf?.rank).toBeGreaterThanOrEqual(5);
    expect(afterSelf?.rank).toBeLessThanOrEqual(6);
    expect(after.self?.text.length).toBeLessThan(before.self?.text.length ?? 0);
    const storedAfter = raceStateSchema
      .parse((await db.lobby.findUniqueOrThrow({ where: { code } })).race)
      .players.find((p) => p.playerIdentityId === humanId);
    if (!storedAfter) throw Error("Human racer missing after activation");
    expect({
      draft: storedAfter.draft,
      progress: storedAfter.progress,
      correct: storedAfter.correct,
      total: storedAfter.total,
      errors: storedAfter.errors,
    }).toEqual({
      draft: storedBefore.draft + beforeTyping.text[crossing - 1],
      progress: storedBefore.progress + 1,
      correct: storedBefore.correct + 1,
      total: storedBefore.total + 1,
      errors: storedBefore.errors,
    });
    expect(raceMetrics(storedAfter, 60000)).toEqual(
      raceMetrics(
        {
          ...storedBefore,
          correct: storedBefore.correct + 1,
          total: storedBefore.total + 1,
        },
        60000,
      ),
    );
    expect(storedAfter.status).toBe("TYPING");
    await page.reload();
    await expect(capture).toBeEnabled();
    const resumed = await snapshot(context.request);
    expect(
      resumed.events.filter((event) => event.id === applied?.id),
    ).toHaveLength(1);
    expect(resumed.self?.items).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath("ten-racer-catchup.png"),
      fullPage: true,
    });
    const evidence = {
      racers: after.players.length,
      bots: after.players.filter((p) => p.kind === "bot").length,
      seed,
      beforeRank: beforeSelf?.rank,
      afterRank: afterSelf?.rank,
      originalWords: before.self?.text.split(" ").length,
      remainingTargetWords: after.self?.text.split(" ").length,
      correctKeystrokesAfterFinalTypedCharacter: storedAfter.correct,
      personalFirstBoxes: receipts.length,
    };
    console.log("Ten-racer catch-up evidence:", JSON.stringify(evidence));
    await testInfo.attach("ten-racer-catchup-evidence", {
      body: JSON.stringify(evidence, null, 2),
      contentType: "application/json",
    });
    for (let attempt = 0; attempt < 8; attempt++) {
      const current = await snapshot(context.request);
      if (
        current.players.find((p) => p.playerIdentityId === humanId)?.status !==
        "TYPING"
      )
        break;
      const rest = current.self?.text.slice(current.self.draft.length) ?? "";
      if (rest) await capture.pressSequentially(rest, { delay: 80 });
      await expect
        .poll(async () => {
          const latest = await snapshot(context.request);
          return (
            latest.players.find((p) => p.playerIdentityId === humanId)
              ?.status !== "TYPING" ||
            (latest.self?.draft.length ?? 0) >=
              Math.min(
                current.self?.text.length ?? 0,
                latest.self?.text.length ?? 0,
              )
          );
        })
        .toBe(true);
    }
    await expect(
      page.getByRole("heading", { name: en.race.results, exact: true }),
    ).toBeVisible({ timeout: 120000 });
    const final = await snapshot(context.request);
    expect(final.players.every((p) => p.status === "FINISHED")).toBe(true);
    for (const player of final.players) {
      expect(player.boxCheckpoints).toEqual([25, 50, 75]);
      expect(player.bonusesReceived).toBe(3);
      const received = final.events.filter(
        (e) =>
          e.outcome === "received" && e.targetId === player.playerIdentityId,
      );
      expect(received).toHaveLength(3);
      expect(new Set(received.map((e) => e.id)).size).toBe(3);
      for (const receipt of received) {
        const used = final.events.filter(
          (event) => event.id === receipt.id.replace(":received", ":used"),
        );
        expect(used).toHaveLength(1);
        expect(used[0].at).toBe(receipt.at);
      }
    }
    await testInfo.attach("ten-racer-final-boxes", {
      body: JSON.stringify(
        final.players.map((p) => ({
          name: p.kind === "bot" ? p.displayName : "Human",
          boxes: p.boxCheckpoints,
          received: p.bonusesReceived,
          status: p.status,
        })),
        null,
        2,
      ),
      contentType: "application/json",
    });
  } finally {
    if (code)
      await context.request.post(`/api/lobbies/${code}/leave`, {
        headers: { origin },
        data: {},
      });
    await context.close();
    await db.$disconnect();
  }
});
