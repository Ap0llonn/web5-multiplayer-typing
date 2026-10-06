import { PRESENCE_GRACE_MS } from "../../contracts/presence";
import { success, failure } from "@/shared/contracts/operation-result";
import type {
  CreateLobbyInput,
  LobbyActor,
  LobbyRole,
  LobbyCharacter,
} from "../../contracts/lobby";
import {
  createRoom,
  createCode,
  joinRoom,
  leaveRoom,
  heartbeatRoom,
  observeRoom,
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
  async joinLobby(
    code: string,
    role: LobbyRole,
    actor: LobbyActor,
    character?: LobbyCharacter,
  ) {
    const result = await this.repository.mutate(code, (room) =>
      joinRoom(room, actor, role, this.now(), character),
    );
    return result.ok ? success(snapshot(result.value, this.now())) : result;
  }
  async leaveLobby(code: string, actor: LobbyActor) {
    const current = await this.repository.findForPlayer(actor.playerIdentityId);
    if (!current.ok) return current;
    if (!current.value || current.value.code !== code)
      return failure("FORBIDDEN");
    const result = await this.repository.mutate(code, (room) =>
      leaveRoom(room, actor.playerIdentityId, this.now()),
    );
    return result.ok ? success(snapshot(result.value, this.now())) : result;
  }
  async observeLobby(code: string, actor: LobbyActor) {
    const found = await this.repository.findForPlayer(actor.playerIdentityId);
    if (!found.ok) return found;
    if (!found.value || found.value.code !== code) return failure("FORBIDDEN");
    const now = this.now();
    const result = found.value.members.some(
      (member) => now - member.lastSeenAt > PRESENCE_GRACE_MS,
    )
      ? await this.repository.mutate(code, (room) =>
          observeRoom(room, actor.playerIdentityId, now),
        )
      : observeRoom(found.value, actor.playerIdentityId, now);
    return result.ok ? success(snapshot(result.value, now)) : result;
  }
  async heartbeat(code: string, actor: LobbyActor) {
    const current = await this.repository.findForPlayer(actor.playerIdentityId);
    if (!current.ok) return current;
    if (!current.value || current.value.code !== code)
      return failure("FORBIDDEN");
    const now = this.now();
    let result = await this.repository.refreshPresence(
      code,
      actor.playerIdentityId,
      now,
      now - PRESENCE_GRACE_MS,
    );
    if (
      result.ok &&
      result.value.members.some(
        (member) => now - member.lastSeenAt > PRESENCE_GRACE_MS,
      )
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
