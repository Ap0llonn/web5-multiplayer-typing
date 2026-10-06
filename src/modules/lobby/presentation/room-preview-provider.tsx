"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { PreviewStyle } from "./preview-avatar";

type PreviewPlayer = {
  id: string;
  name: string;
  style: PreviewStyle;
  local: true;
};

type PreviewState = {
  code: string | null;
  player: PreviewPlayer | null;
  name: string;
  style: PreviewStyle;
};

const emptyState: PreviewState = {
  code: null,
  player: null,
  name: "",
  style: "cobalt",
};

const PreviewContext = createContext<
  | (PreviewState & {
      enterRoom: (code: string) => void;
      changeName: (name: string) => void;
      changeStyle: (style: PreviewStyle) => void;
      prepareEdit: () => void;
      savePlayer: () => void;
      leaveRoom: () => void;
    })
  | null
>(null);

export function RoomPreviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PreviewState>(emptyState);
  return (
    <PreviewContext.Provider
      value={{
        ...state,
        enterRoom: (code) => setState({ ...emptyState, code }),
        changeName: (name) => setState((current) => ({ ...current, name })),
        changeStyle: (style) => setState((current) => ({ ...current, style })),
        prepareEdit: () =>
          setState((current) => ({
            ...current,
            name: current.player?.name ?? "",
            style: current.player?.style ?? "cobalt",
          })),
        savePlayer: () =>
          setState((current) => {
            const name = current.name.trim();
            if (!current.code || name.length < 3 || name.length > 20)
              return current;
            return {
              ...current,
              name,
              player: {
                id: "preview-local",
                name,
                style: current.style,
                local: true,
              },
            };
          }),
        leaveRoom: () => setState(emptyState),
      }}
    >
      {children}
    </PreviewContext.Provider>
  );
}

export function useRoomPreview() {
  const preview = useContext(PreviewContext);
  if (!preview) throw new Error("RoomPreviewProvider is required");
  return preview;
}
