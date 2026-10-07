import "server-only";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaPlayerIdentityRepository } from "./repositories/implementations/prisma-player-identity-repository";
import { DefaultIdentitySupervisor } from "./supervisors/implementations/default-identity-supervisor";
import type { IdentitySupervisor } from "./supervisors/interfaces/identity-supervisor";
import { PrismaProfileRepository } from "./repositories/implementations/prisma-profile-repository";
import { DefaultProfileSupervisor } from "./supervisors/implementations/default-profile-supervisor";
import type { ProfileSupervisor } from "./supervisors/interfaces/profile-supervisor";
export const identitySupervisor: IdentitySupervisor =
  new DefaultIdentitySupervisor(new PrismaPlayerIdentityRepository(prisma));
export const profileSupervisor: ProfileSupervisor =
  new DefaultProfileSupervisor(new PrismaProfileRepository(prisma));
