import { success, failure } from "@/shared/contracts/operation-result";
import type {
  CreateLobbyInput,
  LobbyActor,
  LobbyRole,
} from "../../contracts/lobby";
import {
  createRoom,
  createCode,
  joinRoom,
  leaveRoom,
  heartbeatRoom,
  snapshot,
} from "../../domain/lobby-rules";
import type { LobbyRepository } from "../../repositories/interfaces/lobby-repository";
import type { LobbySupervisor } from "../interfaces/lobby-supervisor";
export class DefaultLobbySupervisor implements LobbySupervisor {
  constructor(
    private readonly repository: LobbyRepository,
    private readonly now: () => number = Date.now,
  ) {}
  async createLobby(input: CreateLobbyInput, actor: LobbyActor) {
    if (actor.kind !== "account") return failure("FORBIDDEN");
    const current = await this.currentLobby(actor);
    if (!current.ok) return current;
    if (current.value) return failure("CONFLICT");
    const created = createRoom(input, actor, createCode(), this.now());
    if (!created.ok) return created;
    const result = await this.repository.create(created.value);
    return result.ok ? success(snapshot(result.value, this.now())) : result;
  }
  async joinLobby(code: string, role: LobbyRole, actor: LobbyActor) {
    const result = await this.repository.mutate(code, (room) =>
      joinRoom(room, actor, role, this.now()),
    );
    return result.ok ? success(snapshot(result.value, this.now())) : result;
  }
  async leaveLobby(code: string, actor: LobbyActor) {
    const result = await this.repository.mutate(code, (room) =>
      leaveRoom(room, actor.playerIdentityId, this.now()),
    );
    return result.ok ? success(snapshot(result.value, this.now())) : result;
  }
  async heartbeat(code: string, actor: LobbyActor) {
    const now = this.now();
    let result = await this.repository.refreshPresence(
      code,
      actor.playerIdentityId,
      now,
      now - 30000,
    );
    if (
      result.ok &&
      result.value.members.some((member) => now - member.lastSeenAt > 30000)
    ) {
      result = await this.repository.mutate(code, (room) =>
        heartbeatRoom(room, actor.playerIdentityId, now),
      );
    }
    return result.ok ? success(snapshot(result.value, now)) : result;
  }
  async currentLobby(actor: LobbyActor) {
    const result = await this.repository.findForPlayer(actor.playerIdentityId);
    if (!result.ok) return result;
    if (!result.value) return success(null);
    const live = await this.heartbeat(result.value.code, actor);
    if (!live.ok)
      return ["FORBIDDEN", "ROOM_CLOSED"].includes(live.error.code)
        ? success(null)
        : live;
    return live;
  }
}
