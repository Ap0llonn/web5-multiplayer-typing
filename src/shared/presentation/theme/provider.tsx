"use client";
import { useSyncExternalStore } from "react";
import { ThemeProvider } from "next-themes";
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
export function Theme({ children }: { children: React.ReactNode }) {
  const client = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // Keep the no-flash script executable for SSR and initial hydration.
      // On client remounts, next-themes applies the theme through its effects.
      scriptProps={client ? { type: "text/plain" } : undefined}
    >
      {children}
    </ThemeProvider>
  );
}
