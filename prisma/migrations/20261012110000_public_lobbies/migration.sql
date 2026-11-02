CREATE TYPE "LobbyVisibility" AS ENUM ('PUBLIC', 'CODE');
ALTER TABLE "Lobby" ADD COLUMN "visibility" "LobbyVisibility" NOT NULL DEFAULT 'CODE';
CREATE INDEX "Lobby_visibility_state_createdAt_idx" ON "Lobby"("visibility", "state", "createdAt");
