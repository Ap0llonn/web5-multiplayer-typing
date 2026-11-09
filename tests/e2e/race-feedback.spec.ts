import { test, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { raceStateSchema } from "../../src/modules/lobby/contracts/race-schemas";
import type {
  RaceItemType,
  LobbySnapshot,
  RaceSnapshot,
} from "../../src/modules/lobby/public";
import type { OperationResult } from "../../src/shared/contracts/operation-result";
import en from "../../src/shared/presentation/i18n/messages/en.json" with { type: "json" };
import fr from "../../src/shared/presentation/i18n/messages/fr.json" with { type: "json" };

test.use({ trace: "off" });
function fixtureDatabase() {
  const value = process.env.DATABASE_URL;
  if (!value) throw Error("Disposable test database required");
  const url = new URL(value);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.port !== "55432" ||
    url.pathname !== "/typing_test"
  )
    throw Error(
      "Feedback fixtures only support the disposable typing_test database",
    );
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: value }),
  });
}
async function readRace(request: APIRequestContext): Promise<RaceSnapshot> {
  const data: OperationResult<LobbySnapshot | null> = await (
    await request.get("/api/lobbies/me")
  ).json();
  if (!data.ok || !data.value?.race) throw Error("Missing fixture race");
  return data.value.race;
}
for (const locale of ["fr", "en"] as const)
  test(`${locale}: all seven confirmed bonus effects have distinct feedback, stay decorative and respect reduced motion`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(90000);
    const messages = locale === "fr" ? fr : en;
    const t = messages.race;
    const db = fixtureDatabase();
    const contexts = await Promise.all(
      [0, 1, 2, 3].map((index) =>
        browser.newContext({
          reducedMotion: locale === "en" ? "reduce" : "no-preference",
          extraHTTPHeaders: {
            "x-forwarded-for": `192.0.2.${150 + index + (locale === "fr" ? 0 : 4)}`,
          },
        }),
      ),
    );
    const [host, guest, observer] = contexts;
    const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
    let code: string | undefined;
    try {
      const username = `fx${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
      expect(
        (
          await host.request.post("/api/auth/sign-up/email", {
            headers: { origin },
            data: {
              username,
              name: "Feedback Host",
              email: `${username}@example.test`,
              password: "test-password-123",
            },
          })
        ).ok(),
      ).toBe(true);
      const created: OperationResult<LobbySnapshot> = await (
        await host.request.post("/api/lobbies", {
          headers: { origin },
          data: { name: "Bonus effects", capacity: 4, role: "PARTICIPANT" },
        })
      ).json();
      if (!created.ok) throw Error("Fixture room missing");
      code = created.value.code;
      const hostId = created.value.hostPlayerIdentityId;
      for (const [index, context] of contexts.slice(1).entries()) {
        expect(
          (
            await context.request.post("/api/auth/sign-in/anonymous", {
              headers: { origin },
              data: { name: `Feedback Racer ${index + 1}` },
            })
          ).ok(),
        ).toBe(true);
        expect(
          (
            await context.request.post("/api/lobbies/join", {
              headers: { origin },
              data: { code, role: "PARTICIPANT" },
            })
          ).ok(),
        ).toBe(true);
      }
      expect(
        (
          await host.request.post(`/api/lobbies/${code}/race/configure`, {
            headers: { origin },
            data: {
              language: "en",
              wordCount: 100,
              durationSeconds: 180,
              correction: "free",
              bonuses: true,
            },
          })
        ).ok(),
      ).toBe(true);
      expect(
        (
          await host.request.post(`/api/lobbies/${code}/race/start`, {
            headers: { origin },
            data: {},
          })
        ).ok(),
      ).toBe(true);
      const h = await host.newPage();
      const g = await guest.newPage();
      const o = await observer.newPage();
      await Promise.all(
        [h, g, o].map((page) => page.goto(`/${locale}/play/room`)),
      );
      if (locale === "fr")
        await h
          .getByRole("button", { name: messages.dark, exact: true })
          .click();
      const guestRoom: OperationResult<LobbySnapshot | null> = await (
        await guest.request.get("/api/lobbies/me")
      ).json();
      if (!guestRoom.ok || !guestRoom.value)
        throw Error("Guest membership missing");
      const guestId = guestRoom.value.members.find(
        (p) => p.displayName === "Feedback Racer 1",
      )?.playerIdentityId;
      if (!guestId) throw Error("Guest identity missing");
      let stage = 0;
      async function prepare(type: RaceItemType) {
        const owner = type === "shield" || type === "clear" ? hostId : guestId;
        const id = `visual-${locale}-${type}-${++stage}`;
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Lobby" WHERE code=${code} FOR UPDATE`;
          const row = await tx.lobby.findUniqueOrThrow({ where: { code } });
          const race = raceStateSchema.parse(row.race);
          race.id = id;
          // The prepared 60% draft must fit the server's 30 keystrokes/s limit.
          race.startsAt = Date.now() - 30000;
          race.endedAt = null;
          race.events = [];
          race.checkpoints = [];
          for (const player of race.players) {
            const fraction =
              player.playerIdentityId === hostId
                ? 0.6
                : player.playerIdentityId === guestId
                  ? 0.25
                  : 0.45;
            player.text = race.text;
            player.progress = Math.ceil(race.text.length * fraction);
            player.draft = race.text.slice(0, player.progress);
            player.correct = player.total = player.progress;
            player.errors = 0;
            player.sequence = 0;
            player.status = "TYPING";
            player.finishedAt = null;
            player.lastEditAt = race.startsAt;
            player.budget = 32;
            player.samples = [];
            player.textRevision = 0;
            // Isolate this one visual; natural pickups are covered in the live races.
            player.boxCheckpoints = [25, 50, 75];
            player.items =
              player.playerIdentityId === owner
                ? [
                    {
                      id: `effect-${stage}`,
                      type,
                      strength: 3,
                      checkpoint: 25,
                      receivedAt: race.startsAt,
                      usedAt: null,
                    },
                  ]
                : [];
            player.bonusesReceived = player.items.length;
            player.shield = false;
            player.fogUntil =
              type === "clear" && player.playerIdentityId === hostId
                ? Date.now() + 12000
                : null;
          }
          await tx.lobby.update({
            where: { id: row.id },
            data: {
              state: "RACING",
              version: { increment: 1 },
              race: {
                ...race,
                settings: { ...race.settings },
                players: race.players.map((p) => ({ ...p, samples: [] })),
              },
            },
          });
          await tx.lobbyMember.updateMany({
            where: { lobbyId: row.id, activePlayerIdentityId: { not: null } },
            data: { lastSeenAt: new Date() },
          });
        });
        const page = owner === hostId ? h : g;
        return { page };
      }
      for (const type of [
        "fog",
        "clear",
        "shortcut",
        "detour",
        "nudge",
        "catchup",
        "shield",
      ] as const) {
        const { page } = await prepare(type);
        const target = type === "fog" || type === "detour" ? h : page;
        const visual = target.locator(
          `[data-bonus-visual="${type}"][data-role="target"]`,
        );
        await expect(visual).toBeVisible();
        await expect(visual.locator("strong")).toHaveText(t.feedback[type]);
        if (type === "fog") {
          await expect(h.locator('[data-fogged="true"]').first()).toBeVisible();
          await h.screenshot({
            path: testInfo.outputPath(`bonus-fog-${locale}.png`),
          });
        }
        expect(
          await target
            .locator(".race-bonus-feedback")
            .evaluate((el) => getComputedStyle(el).pointerEvents),
        ).toBe("none");
        if (locale === "en")
          expect(
            await visual
              .locator(".race-bonus-notice")
              .evaluate((el) => getComputedStyle(el).animationName),
          ).toBe("none");
        else
          expect(
            await visual
              .locator(".race-bonus-notice")
              .evaluate((el) => getComputedStyle(el).animationName),
          ).not.toBe("none");
        await expect(o.locator(".race-bonus-feedback")).toHaveCount(0);
        await o.locator(`[data-impact="${type}"]`).scrollIntoViewIfNeeded();
        await expect(o.locator(`[data-impact="${type}"]`)).toBeVisible();
        if (type === "fog" || type === "detour")
          await expect(
            g.locator(`[data-bonus-visual="${type}"][data-role="sender"]`),
          ).toBeVisible();
        if (type === "fog") {
          await expect(h.locator('[data-atmosphere="fog"]')).toBeVisible();
          const current = await readRace(host.request);
          const capture = h.getByRole("textbox", {
            name: t.typingArea,
            exact: true,
          });
          await expect(capture).toHaveValue(current.self?.draft ?? "");
          await h.locator(".race-input-surface").click();
          await expect(capture).toBeFocused();
          await expect
            .poll(() =>
              capture.evaluate(
                (el: HTMLTextAreaElement) =>
                  el.selectionStart === el.value.length &&
                  el.selectionEnd === el.value.length,
              ),
            )
            .toBe(true);
          await h.keyboard.type(
            current.self?.text[current.self.draft.length] ?? "a",
          );
          await expect
            .poll(async () => (await readRace(host.request)).self?.draft.length)
            .toBe((current.self?.draft.length ?? 0) + 1);

          await expect(h.locator('[data-atmosphere="fog"]')).toHaveCount(0, {
            timeout: 6000,
          });
        }
        if (type === "clear")
          await expect(h.locator('[data-atmosphere="fog"]')).toHaveCount(0);
        if (type === "catchup")
          await page.screenshot({
            path: testInfo.outputPath(`bonus-catchup-${locale}.png`),
          });
        if (type === "shield") {
          await expect(h.locator('[data-atmosphere="shield"]')).toBeVisible();
          await expect(h.locator('[data-bonus-visual="shield"]')).toHaveCount(
            0,
            { timeout: 5000 },
          );
          await h.reload();
          await expect(h.locator('[data-atmosphere="shield"]')).toBeVisible();
          await expect(h.locator('[data-bonus-visual="shield"]')).toHaveCount(
            0,
          );
          await db.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM "Lobby" WHERE code=${code} FOR UPDATE`;
            const row = await tx.lobby.findUniqueOrThrow({ where: { code } });
            const race = raceStateSchema.parse(row.race);
            const attacker = race.players.find(
              (p) => p.playerIdentityId === guestId,
            );
            if (!attacker) throw Error("Missing attacker");
            attacker.items.push({
              id: "blocked-fog",
              type: "fog",
              strength: 3,
              checkpoint: 50,
              receivedAt: Date.now(),
              usedAt: null,
            });
            attacker.bonusesReceived++;
            await tx.lobby.update({
              where: { id: row.id },
              data: {
                version: { increment: 1 },
                race: {
                  ...race,
                  settings: { ...race.settings },
                  players: race.players.map((p) => ({ ...p, samples: [] })),
                },
              },
            });
          });
          await expect(
            h.locator('[data-bonus-visual="blocked"]'),
          ).toBeVisible();
          await expect(h.locator('[data-atmosphere="fog"]')).toHaveCount(0);
          await expect(h.locator('[data-atmosphere="shield"]')).toHaveCount(0);
        }
      }
      if (locale === "en") {
        await h.setViewportSize({ width: 360, height: 780 });
        await prepare("fog");
        await expect(h.locator('[data-atmosphere="fog"]')).toBeVisible();
        expect(
          await h.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
    } finally {
      if (code)
        await host.request.post(`/api/lobbies/${code}/leave`, {
          headers: { origin },
          data: {},
        });
      await Promise.all(contexts.map((c) => c.close()));
      await db.$disconnect();
    }
  });
