import { defineRouting } from "next-intl/routing";
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localeDetection: true,
  localeCookie: { name: "NEXT_LOCALE", maxAge: 31536000 },
});
