import "server-only";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaPlayerIdentityRepository } from "./repositories/implementations/prisma-player-identity-repository";
import { DefaultIdentitySupervisor } from "./supervisors/implementations/default-identity-supervisor";
import type { IdentitySupervisor } from "./supervisors/interfaces/identity-supervisor";
export const identitySupervisor: IdentitySupervisor =
  new DefaultIdentitySupervisor(new PrismaPlayerIdentityRepository(prisma));
