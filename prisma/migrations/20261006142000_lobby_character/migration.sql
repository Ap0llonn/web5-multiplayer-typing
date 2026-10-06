CREATE TYPE "LobbyCharacter" AS ENUM ('cobalt', 'coral', 'mint', 'butter');
ALTER TABLE "LobbyMember" ADD COLUMN "character" "LobbyCharacter" NOT NULL DEFAULT 'cobalt';
