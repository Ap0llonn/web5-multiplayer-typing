import { randomUUID, randomInt } from "node:crypto";
import {
  failure,
  success,
  type OperationResult,
} from "@/shared/contracts/operation-result";
import type { Lobby, LobbyActor } from "../../contracts/lobby";
import type {
  RaceSettings,
  RaceEditInput,
  RaceUseItemInput,
} from "../../contracts/race";
import {
  configureRace,
  startRace,
  editRace,
  abandonRace,
  resetRace,
  DEFAULT_RACE_SETTINGS,
  useRaceItem,
} from "../../domain/race-rules";
import { generateRaceText } from "../../domain/race-text";
import { observeRoom, snapshot } from "../../domain/lobby-rules";
import type { LobbyRepository } from "../../repositories/interfaces/lobby-repository";
import type { RaceTextRepository } from "../../repositories/interfaces/race-text-repository";
import type { RaceSupervisor } from "../interfaces/race-supervisor";
export class DefaultRaceSupervisor implements RaceSupervisor {
  constructor(
    private readonly repository: LobbyRepository,
    private readonly texts: RaceTextRepository,
    private readonly now: () => number = Date.now,
  ) {}
  private async change(
    code: string,
    actor: LobbyActor,
    apply: (room: Lobby, now: number) => OperationResult<Lobby>,
    requiresResults = false,
  ) {
    const found = await this.repository.findForPlayer(actor.playerIdentityId);
    if (!found.ok) return found;
    if (!found.value || found.value.code !== code) return failure("FORBIDDEN");
    const result = await this.repository.mutate(code, (room) => {
      const now = this.now();
      const hadResults = room.state === "RESULTS";
      const observed = observeRoom(room, actor.playerIdentityId, now);
      if (!observed.ok) return observed;
      // Commit a newly reached deadline/result before a later command can erase it.
      if (requiresResults && !hadResults) return failure("CONFLICT");
      return apply(room, now);
    });
    return result.ok
      ? success(snapshot(result.value, this.now(), actor.playerIdentityId))
      : result;
  }
  configure(code: string, actor: LobbyActor, settings: RaceSettings) {
    return this.change(code, actor, (room) =>
      configureRace(room, actor, settings),
    );
  }
  async start(code: string, actor: LobbyActor) {
    const current = await this.repository.findForPlayer(actor.playerIdentityId);
    if (!current.ok) return current;
    if (
      !current.value ||
      current.value.code !== code ||
      actor.kind !== "account" ||
      current.value.hostPlayerIdentityId !== actor.playerIdentityId
    )
      return failure("FORBIDDEN");
    const settings = current.value.raceSettings ?? DEFAULT_RACE_SETTINGS;
    const corpus =
      settings.mode !== "random"
        ? await this.texts.findCorpus(settings.language)
        : success([]);
    if (!corpus.ok) return corpus;
    const dictionary =
      settings.mode === "random"
        ? await this.texts.findDictionary(settings.language)
        : success([]);
    if (!dictionary.ok) return dictionary;
    const text = generateRaceText(
      settings,
      corpus.value,
      dictionary.value,
      () => randomInt(0x1000000) / 0x1000000,
    );
    if (!text.ok) return text;
    return this.change(code, actor, (room, now) => {
      if (
        JSON.stringify(room.raceSettings ?? DEFAULT_RACE_SETTINGS) !==
        JSON.stringify(settings)
      )
        return failure("CONFLICT");
      return startRace(room, actor, text.value, randomUUID(), now);
    });
  }
  edit(code: string, actor: LobbyActor, input: RaceEditInput) {
    return this.change(code, actor, (room, now) =>
      editRace(room, actor, input, now),
    );
  }
  useItem(code: string, actor: LobbyActor, input: RaceUseItemInput) {
    return this.change(code, actor, (room, now) =>
      useRaceItem(room, actor, input, now),
    );
  }
  abandon(code: string, actor: LobbyActor) {
    return this.change(code, actor, (room, now) =>
      abandonRace(room, actor, now),
    );
  }
  reset(code: string, actor: LobbyActor, close: boolean) {
    return this.change(
      code,
      actor,
      (room) => resetRace(room, actor, close),
      true,
    );
  }
}
