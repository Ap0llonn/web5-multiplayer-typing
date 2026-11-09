"use client";
import type { ReactNode } from "react";
import { usePathname } from "@/shared/presentation/i18n/navigation";

export function PlayNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (
    pathname === "/play/player" ||
    pathname === "/play/room" ||
    pathname === "/play/room/settings"
  )
    return null;
  return children;
}
