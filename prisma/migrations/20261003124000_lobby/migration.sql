-- CreateEnum
CREATE TYPE "LobbyState" AS ENUM ('WAITING', 'COUNTDOWN', 'RACING', 'RESULTS', 'CLOSED');

-- CreateEnum
CREATE TYPE "LobbyRole" AS ENUM ('PARTICIPANT', 'SPECTATOR');

-- CreateTable
CREATE TABLE "Lobby" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "hostPlayerIdentityId" TEXT NOT NULL,
    "state" "LobbyState" NOT NULL DEFAULT 'WAITING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LobbyMember" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "playerIdentityId" TEXT NOT NULL,
    "activePlayerIdentityId" TEXT,
    "kind" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "LobbyRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LobbyMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lobby_code_key" ON "Lobby"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyMember_activePlayerIdentityId_key" ON "LobbyMember"("activePlayerIdentityId");

-- CreateIndex
CREATE INDEX "LobbyMember_lobbyId_activePlayerIdentityId_idx" ON "LobbyMember"("lobbyId", "activePlayerIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyMember_lobbyId_playerIdentityId_key" ON "LobbyMember"("lobbyId", "playerIdentityId");

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_hostPlayerIdentityId_fkey" FOREIGN KEY ("hostPlayerIdentityId") REFERENCES "PlayerIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyMember" ADD CONSTRAINT "LobbyMember_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyMember" ADD CONSTRAINT "LobbyMember_playerIdentityId_fkey" FOREIGN KEY ("playerIdentityId") REFERENCES "PlayerIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_capacity_check" CHECK (capacity BETWEEN 2 AND 30);
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_code_check" CHECK (code ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$');
ALTER TABLE "LobbyMember" ADD CONSTRAINT "LobbyMember_active_identity_check" CHECK ("activePlayerIdentityId" IS NULL OR "activePlayerIdentityId" = "playerIdentityId");
ALTER TABLE "LobbyMember" ADD CONSTRAINT "LobbyMember_kind_check" CHECK (kind IN ('guest','account'));
