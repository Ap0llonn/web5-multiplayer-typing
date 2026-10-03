"use client";
import { createAuthClient } from "better-auth/react";
import { anonymousClient, usernameClient } from "better-auth/client/plugins";
export const authClient = createAuthClient({
  plugins: [anonymousClient(), usernameClient()],
});
export const signInGuest = (name: string) =>
  authClient.$fetch("/sign-in/anonymous", { method: "POST", body: { name } });
