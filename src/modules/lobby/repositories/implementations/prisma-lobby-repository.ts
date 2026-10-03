import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import {
  success,
  failure,
  type OperationResult,
} from "@/shared/contracts/operation-result";
import type { Lobby } from "../../contracts/lobby";
import { createCode } from "../../domain/lobby-rules";
import type { LobbyRepository } from "../interfaces/lobby-repository";
type Row = Prisma.LobbyGetPayload<{ include: { members: true } }>;
function fromRow(row: Row): Lobby {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    capacity: row.capacity,
    hostPlayerIdentityId: row.hostPlayerIdentityId,
    state: row.state,
    version: row.version,
    members: row.members
      .filter((m) => m.activePlayerIdentityId !== null)
      .map((m) => ({
        playerIdentityId: m.playerIdentityId,
        kind: m.kind === "account" ? "account" : "guest",
        displayName: m.displayName,
        role: m.role,
        joinedAt: m.joinedAt.getTime(),
        lastSeenAt: m.lastSeenAt.getTime(),
      })),
  };
}
function memberData(member: Lobby["members"][number]) {
  return {
    playerIdentityId: member.playerIdentityId,
    activePlayerIdentityId: member.playerIdentityId,
    kind: member.kind,
    displayName: member.displayName,
    role: member.role,
    joinedAt: new Date(member.joinedAt),
    lastSeenAt: new Date(member.lastSeenAt),
  };
}
export class PrismaLobbyRepository implements LobbyRepository {
  constructor(private readonly db: PrismaClient) {}
  async create(room: Lobby): Promise<OperationResult<Lobby>> {
    for (let attempt = 0; attempt < 5; attempt++)
      try {
        const { members, ...data } = room;
        await this.db.lobby.create({
          data: { ...data, members: { create: members.map(memberData) } },
        });
        return success(room);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          if (await this.db.lobby.findUnique({ where: { code: room.code } })) {
            room.code = createCode();
            continue;
          }
          return failure("CONFLICT");
        }
        return failure("INTERNAL");
      }
    return failure("CONFLICT");
  }
  async mutate(
    code: string,
    change: (room: Lobby) => OperationResult<Lobby>,
  ): Promise<OperationResult<Lobby>> {
    for (let attempt = 0; attempt < 5; attempt++)
      try {
        return await this.db.$transaction(
          async (tx) => {
            await tx.$queryRaw`SELECT id FROM "Lobby" WHERE code=${code} FOR UPDATE`;
            const row = await tx.lobby.findUnique({
              where: { code },
              include: { members: true },
            });
            if (!row) return failure("NOT_FOUND");
            const room = fromRow(row);
            const before = JSON.stringify(room);
            const result = change(room);
            // Presence reconciliation may expire a room while refusing an expired actor.
            if (JSON.stringify(room) !== before) {
              room.version++;
              await tx.lobby.update({
                where: { id: room.id },
                data: {
                  hostPlayerIdentityId: room.hostPlayerIdentityId,
                  state: room.state,
                  version: room.version,
                  capacity: room.capacity,
                },
              });
              await tx.lobbyMember.updateMany({
                where: {
                  lobbyId: room.id,
                  activePlayerIdentityId: { not: null },
                  playerIdentityId: {
                    notIn: room.members.map((m) => m.playerIdentityId),
                  },
                },
                data: { activePlayerIdentityId: null },
              });
              for (const member of room.members) {
                const old = row.members.find(
                  (m) => m.playerIdentityId === member.playerIdentityId,
                );
                if (
                  old &&
                  old.activePlayerIdentityId === member.playerIdentityId &&
                  old.lastSeenAt.getTime() === member.lastSeenAt &&
                  old.role === member.role &&
                  old.displayName === member.displayName
                )
                  continue;
                await tx.lobbyMember.upsert({
                  where: {
                    lobbyId_playerIdentityId: {
                      lobbyId: room.id,
                      playerIdentityId: member.playerIdentityId,
                    },
                  },
                  create: { lobbyId: room.id, ...memberData(member) },
                  update: memberData(member),
                });
              }
            }
            return result.ok ? success(room) : result;
          },
          { isolationLevel: "ReadCommitted" },
        );
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2034") continue;
          if (error.code === "P2002") return failure("CONFLICT");
        }
        return failure("INTERNAL");
      }
    return failure("CONFLICT");
  }
  async refreshPresence(
    code: string,
    playerIdentityId: string,
    now: number,
    activeSince: number,
  ): Promise<OperationResult<Lobby>> {
    try {
      return await this.db.$transaction(
        async (tx) => {
          // Shared room lock prevents membership/state mutations during a presence sample.
          // Concurrent heartbeats share this lock and update only their own member row.
          const locked = await tx.$queryRaw<
            Array<{ id: string }>
          >`SELECT id FROM "Lobby" WHERE code=${code} FOR SHARE`;
          if (!locked[0]) return failure("NOT_FOUND");
          await tx.lobbyMember.updateMany({
            where: {
              lobbyId: locked[0].id,
              activePlayerIdentityId: playerIdentityId,
              lastSeenAt: { gte: new Date(activeSince) },
            },
            data: { lastSeenAt: new Date(now) },
          });
          const row = await tx.lobby.findUnique({
            where: { id: locked[0].id },
            include: { members: true },
          });
          if (!row) return failure("NOT_FOUND");
          if (row.state === "CLOSED") return failure("ROOM_CLOSED");
          const room = fromRow(row);
          if (
            !room.members.some((m) => m.playerIdentityId === playerIdentityId)
          )
            return failure("FORBIDDEN");
          return success(room);
        },
        { isolationLevel: "ReadCommitted" },
      );
    } catch {
      return failure("INTERNAL");
    }
  }
  async findForPlayer(
    playerIdentityId: string,
  ): Promise<OperationResult<Lobby | null>> {
    try {
      const member = await this.db.lobbyMember.findUnique({
        where: { activePlayerIdentityId: playerIdentityId },
        include: { lobby: { include: { members: true } } },
      });
      return success(member ? fromRow(member.lobby) : null);
    } catch {
      return failure("INTERNAL");
    }
  }
}
