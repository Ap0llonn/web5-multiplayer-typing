import type { LobbySnapshot } from "../public";
export type LobbyViewState = {
  room: LobbySnapshot | null;
  generation: number;
  conflictNotice?: true;
};
export type LobbyViewAction =
  | { type: "loaded"; room: LobbySnapshot | null; generation: number }
  | { type: "command"; room: LobbySnapshot | null }
  | { type: "recovered"; room: LobbySnapshot; generation: number }
  | { type: "snapshot"; room: LobbySnapshot; code: string };
export function lobbyViewReducer(
  state: LobbyViewState,
  action: LobbyViewAction,
): LobbyViewState {
  if (action.type === "loaded")
    return action.generation === state.generation
      ? {
          room: action.room,
          generation: state.generation + (action.room ? 1 : 0),
        }
      : state;
  if (action.type === "recovered")
    return action.generation === state.generation &&
      !(
        state.room?.code === action.room.code &&
        state.room.version > action.room.version
      )
      ? {
          room: action.room,
          generation: state.generation + 1,
          conflictNotice: true,
        }
      : state;
  if (action.type === "command")
    return { room: action.room, generation: state.generation + 1 };
  if (
    !state.room ||
    state.room.code !== action.code ||
    state.room.version > action.room.version
  )
    return state;
  return { ...state, room: action.room, generation: state.generation + 1 };
}
