ALTER TABLE "RaceResult" ADD COLUMN "bonusesReceived" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_bonuses_received_check" CHECK ("bonusesReceived" BETWEEN 0 AND 3);
