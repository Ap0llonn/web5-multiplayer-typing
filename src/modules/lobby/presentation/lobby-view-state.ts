import type { LobbySnapshot } from "../public";
export type LobbyViewState = { room: LobbySnapshot | null; generation: number };
export type LobbyViewAction =
  | { type: "loaded"; room: LobbySnapshot | null; generation: number }
  | { type: "command"; room: LobbySnapshot | null }
  | { type: "snapshot"; room: LobbySnapshot; code: string };
export function lobbyViewReducer(
  state: LobbyViewState,
  action: LobbyViewAction,
): LobbyViewState {
  if (action.type === "loaded")
    return action.generation === state.generation
      ? { ...state, room: action.room }
      : state;
  if (action.type === "command")
    return { room: action.room, generation: state.generation + 1 };
  if (
    !state.room ||
    state.room.code !== action.code ||
    state.room.version > action.room.version
  )
    return state;
  return { ...state, room: action.room };
}
