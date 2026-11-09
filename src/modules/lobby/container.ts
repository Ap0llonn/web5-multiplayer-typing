import "server-only";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaLobbyRepository } from "./repositories/implementations/prisma-lobby-repository";
import { DefaultLobbySupervisor } from "./supervisors/implementations/default-lobby-supervisor";
import type { LobbySupervisor } from "./supervisors/interfaces/lobby-supervisor";
import { DefaultRaceSupervisor } from "./supervisors/implementations/default-race-supervisor";
import { PrismaRaceTextRepository } from "./repositories/implementations/prisma-race-text-repository";
import type { RaceSupervisor } from "./supervisors/interfaces/race-supervisor";
export const raceSupervisor: RaceSupervisor = new DefaultRaceSupervisor(
  new PrismaLobbyRepository(prisma),
  new PrismaRaceTextRepository(prisma),
);
export const lobbySupervisor: LobbySupervisor = new DefaultLobbySupervisor(
  new PrismaLobbyRepository(prisma),
);
