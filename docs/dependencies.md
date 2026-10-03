# Versions du socle

Vérifiées dans le registre officiel npm le 3 octobre 2026 ; chaque dépendance directe et le lockfile sont verrouillés. Node 24.19.0, pnpm 11.19.0, Next 16.3.8, React 19.3.0, Better Auth 1.7.7, Prisma 7.10.0 (stable ; Prisma 8 publié comme RC exclu), PostgreSQL18.4 jetable, TypeScript5.9.3, ESLint9.39.4, Tailwind4.3.3. TypeScript7/ESLint10 ne satisfont pas encore les peer-dependencies des plugins Next/TypeScript-ESLint sélectionnés ; maintien sur leurs versions compatibles. ESLint9 porte un avertissement upstream de maintenance : migration du toolchain à suivre.

Sources : [Next](https://nextjs.org/docs), [Better Auth Next](https://better-auth.com/docs/integrations/next), [Prisma](https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v7), [username](https://better-auth.com/docs/plugins/username), [anonymous](https://better-auth.com/docs/plugins/anonymous), [rate limiting](https://better-auth.com/docs/concepts/rate-limit).

Instructions AGENTS et guides Next livrés dans node_modules/next/dist/docs lus : App Router layouts/pages, route handlers, proxy. Schéma auth généré par CLI officiel auth1.7.7, puis migration Prisma. Schéma applicatif ajouté sans recopier Type.
