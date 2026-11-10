import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/shared/infrastructure/auth/config";
import { preserveGuestOnSignup } from "@/composition/auth/guest-signup";
export const GET = (request: Request) =>
  toNextJsHandler(getAuth(preserveGuestOnSignup)).GET(request);
export const POST = (request: Request) =>
  toNextJsHandler(getAuth(preserveGuestOnSignup)).POST(request);
