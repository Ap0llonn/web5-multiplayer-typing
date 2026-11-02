CREATE TABLE "LobbyBan" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "playerIdentityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LobbyBan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LobbyBan_lobbyId_playerIdentityId_key"
    ON "LobbyBan"("lobbyId", "playerIdentityId");
CREATE INDEX "LobbyBan_playerIdentityId_idx"
    ON "LobbyBan"("playerIdentityId");

ALTER TABLE "LobbyBan" ADD CONSTRAINT "LobbyBan_lobbyId_fkey"
    FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LobbyBan" ADD CONSTRAINT "LobbyBan_playerIdentityId_fkey"
    FOREIGN KEY ("playerIdentityId") REFERENCES "PlayerIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
