import "server-only";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaLobbyRepository } from "./repositories/implementations/prisma-lobby-repository";
import { DefaultLobbySupervisor } from "./supervisors/implementations/default-lobby-supervisor";
import type { LobbySupervisor } from "./supervisors/interfaces/lobby-supervisor";
export const lobbySupervisor: LobbySupervisor = new DefaultLobbySupervisor(
  new PrismaLobbyRepository(prisma),
);
