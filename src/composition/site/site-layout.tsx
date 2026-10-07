import type { ReactNode } from "react";
import { Shell } from "@/shared/presentation/ui/shell";
import { getAccountControls } from "./account-controls";

export async function SiteLayout({ children }: { children: ReactNode }) {
  const accountControl = await getAccountControls();
  return <Shell accountControl={accountControl}>{children}</Shell>;
}
