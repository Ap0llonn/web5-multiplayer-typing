"use client";

import { useRouter } from "@/shared/presentation/i18n/navigation";
import { PreviewRoomEntry } from "./preview-room-entry";
import { useRoomPreview } from "./room-preview-provider";

export function PreviewCodePage() {
  const preview = useRoomPreview();
  const router = useRouter();
  return (
    <PreviewRoomEntry
      onEnter={(code) => {
        preview.enterRoom(code);
        router.push("/play/player");
      }}
    />
  );
}
