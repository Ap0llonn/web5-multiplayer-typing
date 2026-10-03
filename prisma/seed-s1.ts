import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Maintenance fixture only: never a path for creating authenticated accounts.
function safeTarget(raw: string | undefined) {
  if (process.env.NODE_ENV === "production" || !raw) return null;
  try {
    const url = new URL(raw);
    return ["postgres:", "postgresql:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      /^\/[a-z0-9][a-z0-9_-]*_(dev|test)$/.test(url.pathname) &&
      !url.search &&
      !url.hash
      ? raw
      : null;
  } catch {
    return null;
  }
}

const connectionString = safeTarget(process.env.DATABASE_URL);
if (!connectionString) {
  console.error(
    "S1 seed refused: use a local *_dev or *_test database outside production.",
  );
  process.exitCode = 1;
} else {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    await prisma.$transaction(async (tx) => {
      // Serialize only this fixture command, including concurrent first runs.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(775834201)`;
      const people = [
        {
          id: "seed-s1-host",
          name: "Recette S1 Host",
          isAnonymous: false,
          kind: "account",
        },
        {
          id: "seed-s1-guest",
          name: "Recette S1 Guest",
          isAnonymous: true,
          kind: "guest",
        },
      ] as const;
      for (const person of people) {
        const user = await tx.user.upsert({
          where: { id: person.id },
          update: {},
          create: {
            id: person.id,
            name: person.name,
            email: `${person.id}@example.invalid`,
            isAnonymous: person.isAnonymous,
          },
        });
        if (
          user.email !== `${person.id}@example.invalid` ||
          user.isAnonymous !== person.isAnonymous
        )
          throw new Error("Fixture user conflict");
        const identity = await tx.playerIdentity.upsert({
          where: { id: `${person.id}-player` },
          update: {},
          create: { id: `${person.id}-player`, authUserId: person.id },
        });
        if (identity.authUserId !== person.id)
          throw new Error("Fixture identity conflict");
      }
      const lobby = await tx.lobby.upsert({
        where: { id: "seed-s1-room" },
        update: {},
        create: {
          id: "seed-s1-room",
          code: "SEED23",
          name: "Recette S1 — exemple fermé",
          capacity: 2,
          state: "CLOSED",
          hostPlayerIdentityId: "seed-s1-host-player",
        },
      });
      if (
        lobby.code !== "SEED23" ||
        lobby.state !== "CLOSED" ||
        lobby.hostPlayerIdentityId !== "seed-s1-host-player"
      )
        throw new Error("Fixture room conflict");
      const createdAt = new Date();
      for (const person of people) {
        const member = await tx.lobbyMember.upsert({
          where: { id: `${person.id}-membership` },
          update: {},
          create: {
            id: `${person.id}-membership`,
            lobbyId: "seed-s1-room",
            playerIdentityId: `${person.id}-player`,
            activePlayerIdentityId: null,
            kind: person.kind,
            displayName: person.name,
            role: "PARTICIPANT",
            joinedAt: createdAt,
            lastSeenAt: createdAt,
          },
        });
        if (
          member.lobbyId !== lobby.id ||
          member.playerIdentityId !== `${person.id}-player` ||
          member.activePlayerIdentityId !== null ||
          member.kind !== person.kind
        )
          throw new Error("Fixture membership conflict");
      }
    });
    console.log(
      "S1 seed ready: 2 synthetic users, 1 closed sample room; no credentials or sessions.",
    );
  } catch {
    console.error(
      "S1 seed failed: transaction rolled back. Check local migrations and fixture ID/code conflicts.",
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
