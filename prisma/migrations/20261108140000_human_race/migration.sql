ALTER TABLE "Lobby" ADD COLUMN "raceSettings" JSONB NOT NULL DEFAULT '{"language":"fr","wordCount":30,"durationSeconds":120,"correction":"required"}', ADD COLUMN "race" JSONB;
CREATE TABLE "PracticeText" ("id" TEXT PRIMARY KEY, "language" TEXT NOT NULL, "content" TEXT NOT NULL, "source" TEXT NOT NULL);
CREATE INDEX "PracticeText_language_idx" ON "PracticeText"("language");
CREATE TABLE "RaceResult" (
  "raceId" TEXT NOT NULL, "playerIdentityId" TEXT NOT NULL,
  "finishedAt" TIMESTAMP(3) NOT NULL, "status" TEXT NOT NULL,
  "wpm" DOUBLE PRECISION NOT NULL, "grossWpm" DOUBLE PRECISION NOT NULL,
  "accuracy" DOUBLE PRECISION NOT NULL, "errors" INTEGER NOT NULL,
  "elapsedMs" INTEGER NOT NULL, "samples" JSONB NOT NULL,
  CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("raceId", "playerIdentityId"),
  CONSTRAINT "RaceResult_playerIdentityId_fkey" FOREIGN KEY ("playerIdentityId") REFERENCES "PlayerIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "RaceResult_playerIdentityId_finishedAt_idx" ON "RaceResult"("playerIdentityId", "finishedAt");
-- Original practice passages written for this project; no external copyrighted corpus.
INSERT INTO "PracticeText" ("id", "language", "content", "source") VALUES
('practice-fr-v1', 'fr', 'Le matin, la ville se réveille doucement. Une fenêtre laisse entrer la lumière pendant que les premiers vélos traversent la place. Dans le petit jardin, une feuille tourne au rythme du vent. Chaque détail invite à regarder autour de soi. Au bout de la rue, des amis préparent une promenade et choisissent ensemble leur chemin. Personne ne cherche à arriver avant les autres. Le plaisir vient des découvertes, des histoires partagées et des pauses près de la rivière. Plus loin, un pont de pierre relie les deux rives. Un oiseau se pose un instant sur la rampe puis reprend son envol. La journée commence avec cette impression simple que chaque pas peut ouvrir une nouvelle possibilité. Les nuages dessinent des formes changeantes et chacun y reconnaît une image différente. On prend le temps de sourire avant de continuer.', 'Texte original du projet, version 1, 8 novembre 2026.'),
('practice-en-v1', 'en', 'Morning arrives quietly in the town. A window catches the light while the first bicycles cross the square. In a small garden, a leaf turns slowly with the wind. Every detail invites us to look around. At the end of the street, a group of friends prepares for a walk and chooses a path together. Nobody needs to reach the destination before the others. The pleasure comes from discoveries, shared stories, and a short rest beside the river. Further along, a stone bridge connects the two banks. A bird lands on the railing for a moment before taking flight again. The day begins with a simple feeling that every step can open another possibility. Clouds draw changing shapes above the rooftops, and everyone finds a different picture in them. We take a moment to smile before moving on.', 'Original project text, version 1, November 8, 2026.');
