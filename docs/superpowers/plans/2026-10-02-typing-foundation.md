# Typing Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer le squelette exécutable du jeu de frappe : identité compte/invité, PostgreSQL, interface FR/EN et thèmes, frontières métier vérifiées et CI reproductible.

**Architecture:** Application Next.js à la racine, modules `identity` et `lobby`, composition pour les workflows intermodules et dépendances injectées. Better Auth possède le protocole HTTP et les sessions ; les cas métier obtiennent leur acteur exclusivement côté serveur. Les salons sont des contrats documentés, sans faux parcours fonctionnel.

**Tech Stack:** Next.js App Router, TypeScript, pnpm, PostgreSQL/Prisma, Better Auth avec plugins username/anonymous, next-intl, next-themes, Vitest, Playwright, GitHub Actions. Vérifier les versions stables compatibles au début de l'exécution, puis verrouiller versions, Node et lockfile.

**Spec:** `docs/superpowers/specs/2026-10-02-typing-foundation-design.md` — dépôt cible `Ap0llonn/web5-multiplayer-typing`, vide lors de la vérification du 2 octobre 2026.

**Décision du 2 octobre 2026 :** l'utilisateur a accepté l'email à l'inscription et autorisé le démarrage du squelette complet. Better Auth est retenu ; connexion par identifiant/mot de passe. Les mentions d'approbation encore en attente dans la copie initiale de la spécification sont dépassées par cette décision. Le présent plan reste à présenter pour revue avant implémentation et sélection de l'environnement d'exécution.

## Global Constraints

- « Application à la racine du nouveau dépôt ; aucun répertoire `tempo/` hérité. »
- « Aucun module n’importe un autre module, `app` ou `composition`. `shared` n’importe aucun module. »
- « `public.ts` n’exporte que les contrats partageables. `server.ts`, conteneurs, DB, configuration et adaptateurs portent `server-only`. »
- « Les superviseurs ne connaissent ni Next.js, ni Prisma, ni WebSocket. »
- « Aucun faux salon ou faux succès d’authentification ne doit masquer ces exclusions. »
- « Aucun plafond produit arbitraire de 32 personnes n’est introduit. »
- « La fusion des comptes par seule égalité d’email est désactivée. »
- « Aucun historique invité n’est supprimé automatiquement dans ce lot. »
- « `next-intl` conserve des URLs `/fr` et `/en`, FR par défaut, avec navigation et préférence persistante. »
- « Les versions stables compatibles seront vérifiées et verrouillées au début de l’implémentation ; le lockfile et la version Node sont versionnés. »
- « Variables requises au runtime : `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. »
- « `.env.example` décrit leurs noms avec valeurs vides, sans réutiliser celles de Type. »
- Session de 7 jours, renouvellement quotidien ; aucune récupération de mot de passe ni service d'email. Pas de course, temps réel, création/entrée de salon, OAuth de production, création de credentials, push, fusion ou déploiement implicitement autorisés.

## Review Focus

1. Session révoquée ou expirée avec page encore ouverte : chaque opération protégée refuse l'acteur, sans faire confiance au layout (tâche 3).
2. Double clic et requêtes concurrentes : pas de double identité, pas de succès après échec, boutons réactivés après erreur (tâches 2–4).
3. Invité ouvrant l'inscription/la connexion : aucune conversion, fusion ou suppression silencieuse de son identité (tâches 2 et 4).
4. Configuration OAuth partielle ou locale/langue invalide : erreur déterministe ou retour vers FR, sans bouton trompeur (tâches 2 et 4).
5. Thème stocké, navigation Retour/Avancer et rafraîchissement mobile : préférence conservée, contrôles accessibles, aucune erreur d'hydratation (tâche 4).

---

## Carte des fichiers et commandes

Les fichiers sont détaillés dans chaque tâche. Ne créer aucun dossier vide pour simuler une implémentation. `src/app` ne fait que router ; `src/composition` assemble les écrans ; `src/modules/identity` expose les contrats et adaptateurs ; `src/modules/lobby` expose uniquement les futurs contrats ; `src/shared` porte infrastructure et présentation génériques.

Contrat de scripts à établir : `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm check:boundaries`, `pnpm db:test:up`, `pnpm db:test:down`, `pnpm db:validate`, `pnpm db:generate`, `pnpm db:migrate:test`. Les scripts de test utilisent exclusivement une base jetable ; ils refusent une URL de production. CI peut fournir son propre service PostgreSQL jetable.

### Task 1: Bootstrap vérifiable et contrats partagés

**Files:** créer `package.json`, `pnpm-lock.yaml`, `.node-version`, `.gitignore`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/shared/contracts/operation-result.ts`, `tests/unit/operation-result.test.ts`, `docs/dependencies.md`.

**Interfaces:** produit `ErrorCode = 'VALIDATION' | 'UNAUTHENTICATED' | 'CONFLICT' | 'PROVIDER_UNAVAILABLE' | 'INTERNAL'` et `OperationResult<T> = { ok: true; value: T } | { ok: false; error: { code: ErrorCode; messageKey: string } }`. Aucun message fournisseur brut dans ce contrat.

- [ ] Lire `AGENTS.md`, les compétences locales pertinentes, le dépôt vide et les docs Next.js livrées avec la version sélectionnée. Préparer une branche/worktree isolé ; consigner les versions vérifiées et sources officielles dans `docs/dependencies.md`.
- [ ] Installer uniquement le bootstrap et le harnais de tests, avec versions exactes compatibles et pnpm fixé dans `packageManager`. Écrire `operation-result.test.ts` avec `expectTypeOf` : succès exige `value`, erreur exige le code fermé ; `@ts-expect-error` rejette un booléen et un code inconnu.
- [ ] Exécuter `pnpm test:unit -- tests/unit/operation-result.test.ts` et `pnpm typecheck` : échec attendu avant la définition du contrat.
- [ ] Implémenter le contrat et le minimum Next.js permettant un build. Configurer lint, typecheck et unitaires, sans recopier Type.
- [ ] Relancer les deux contrôles puis `pnpm lint && pnpm build` : tous verts. Commit local `chore: bootstrap typed Next.js foundation`.

### Task 2: PostgreSQL et protocole officiel d'authentification

**Files:** créer `prisma/schema.prisma`, `prisma/migrations/**`, la configuration Prisma requise par la version installée, `compose.test.yml`, `scripts/test-db.mjs`, `.env.example`, `src/shared/infrastructure/env/server.ts`, `src/shared/infrastructure/db/prisma.ts`, `src/shared/infrastructure/auth/config.ts`, `src/app/api/auth/[...all]/route.ts`, `tests/unit/env.test.ts`, `tests/integration/auth-http.test.ts`, `tests/integration/migrations.test.ts`.

**Interfaces:** `readServerEnv(source: NodeJS.ProcessEnv): ServerEnv` fournit URL DB, secret, URL d'auth et providers complets ; configuration OAuth renvoie une liste publique de providers activés sans leurs secrets. `auth` est l'instance Better Auth serveur ; le handler GET/POST utilise son intégration officielle Next.js. Modèle `PlayerIdentity { id: string; authUserId: string @unique }`, relation vers `User` conservant les identités sans suppression automatique ; pas de modèle de salon implémenté.

- [ ] Écrire les tests : variables obligatoires absentes ⇒ erreur expurgée ; provider absent ⇒ désactivé ; ID seul ou secret seul ⇒ rejet ; paire complète ⇒ activée. Contrat HTTP sur base vide : inscription email/username/password, connexion username, doublon normalisé rejeté, mauvais mot de passe refusé, session lue, déconnexion invalide la session.
- [ ] Exécuter `pnpm test:unit -- tests/unit/env.test.ts` puis `pnpm test:integration -- tests/integration/auth-http.test.ts` : échec attendu tant que configuration/route/migration manquent.
- [ ] Générer le schéma Better Auth avec l'outil officiel compatible avec la version verrouillée, ajouter `PlayerIdentity`, puis produire et versionner la migration Prisma initiale. Activer username et anonymous, session `604800` secondes et renouvellement `86400` secondes, limitation HTTP intégrée, origines de confiance explicites, liaison automatique des comptes désactivée et suppression automatique des invités désactivée selon les options officielles de cette version. Aucun hasher maison ni Server Action substituée aux endpoints auth.
- [ ] Ajouter au test HTTP : connexion anonyme crée une vraie session ; répétition/concurrence ne supprime aucune identité ; ouverture du parcours compte n'efface pas le compte invité ; requête d'origine étrangère rejetée ; limiteur testé avec une fenêtre déterministe. Tester une base vide et la réapplication sans nouvelle migration. Ne pas injecter de secrets de production ; le harnais génère ses valeurs éphémères hors fichiers versionnés.
- [ ] Exécuter `pnpm db:test:up && pnpm db:validate && pnpm db:generate && pnpm db:migrate:test && pnpm test:integration` puis les unitaires : tous verts sur PostgreSQL réel jetable. Si Docker est indisponible, utiliser un PostgreSQL de test fourni par l'environnement ; signaler le blocage plutôt que simuler la preuve DB. Commit local `feat: add PostgreSQL-backed authentication`.

### Task 3: Identité applicative et autorisation serveur

**Files:** créer `src/modules/identity/{public,server,container}.ts`, `contracts/{actor,identity-error}.ts`, `domain/player-identity.ts`, `supervisors/interfaces/identity-supervisor.ts`, `supervisors/implementations/default-identity-supervisor.ts`, `repositories/interfaces/player-identity-repository.ts`, `repositories/implementations/prisma-player-identity-repository.ts`, `infrastructure/{session-reader,auth-client}.ts`, `tests/unit/identity-supervisor.test.ts`, `tests/integration/player-identity.test.ts` sous les emplacements de module/tests appropriés.

**Interfaces:** `AuthPrincipal = { authUserId: string; kind: 'guest' | 'account'; displayName: string }` ; `Actor = { playerIdentityId: string; kind: 'guest' | 'account'; displayName: string }`. `PlayerIdentityRepository.ensureForAuthUser(authUserId: string): Promise<OperationResult<{ id: string }>>` ; `IdentitySupervisor.resolveActor(principal: AuthPrincipal | null): Promise<OperationResult<Actor>>` ; API serveur `getCurrentActor(headers: Headers): Promise<OperationResult<Actor>>`. Cette API relit la session Better Auth et n'accepte jamais d'identifiant utilisateur transmis comme preuve d'identité.

- [ ] Écrire les unitaires : principal absent ⇒ `UNAUTHENTICATED` ; invité et compte ⇒ mêmes droits de participation ; erreurs repository ⇒ résultat typé sans détail DB. Intégration : deux `ensureForAuthUser` concurrents ⇒ même ID et une seule ligne ; deux utilisateurs ⇒ IDs distincts.
- [ ] Exécuter `pnpm test:unit -- tests/unit/identity-supervisor.test.ts` et `pnpm test:integration -- tests/integration/player-identity.test.ts` : rouges avant implémentation.
- [ ] Implémenter un upsert atomique sur la clé unique et la traduction d'erreurs. Injecter le repository dans le superviseur. Garder `Headers`, Next.js, Better Auth et Prisma hors des interfaces métier ; le pont serveur compose session-reader et superviseur. Ajouter `server-only` à chaque entrée serveur.
- [ ] Compléter l'intégration via sessions HTTP réelles : valide ⇒ acteur ; absente/expirée/révoquée ⇒ `UNAUTHENTICATED` à chaque appel ; refresh/nouvelle requête avec le même cookie ⇒ même identité. Cookies effacés ⇒ aucune promesse de récupération anonyme. Les mots de passe/tokens ne paraissent jamais dans résultats ou logs capturés.
- [ ] Relancer unitaires, intégration et typecheck : tous verts. Commit local `feat: resolve trusted player identities`.

### Task 4: Parcours réels, FR/EN et thèmes

**Files:** remplacer les pages temporaires de tâche 1 par `src/app/[locale]/{layout,page}.tsx`, `src/app/[locale]/(auth)/{login,signup}/page.tsx` ; créer `src/proxy.ts`, `src/composition/home/home-page.tsx`, `src/composition/auth/{login,signup}-page.tsx`, `src/modules/identity/presentation/{login-form,signup-form,guest-button,sign-out-button}.tsx`, `src/modules/identity/contracts/auth-error.ts`, `src/shared/presentation/i18n/{routing,navigation,request}.ts`, `src/shared/presentation/i18n/messages/{fr,en}.json`, `src/shared/presentation/theme/{provider,theme-toggle}.tsx`, `src/shared/presentation/styles/tokens.css`, `playwright.config.ts`, `tests/e2e/{auth,preferences,navigation}.spec.ts`, `tests/unit/auth-error.test.ts`.

**Interfaces:** `mapAuthError(code: string | undefined): { code: ErrorCode; messageKey: string }` ne retourne que les clés locales connues. `auth-client.ts` encapsule le client officiel Better Auth et ses plugins ; les formulaires n'importent que cet adaptateur client et les contrats publics. `Locale = 'fr' | 'en'` ; thème persistant `'light' | 'dark'`.

- [ ] Écrire les tests navigateur : `/` arrive en FR ; FR↔EN conserve la page et la préférence au reload ; bascule clair/sombre persiste et ne génère aucune erreur d'hydratation. Inscription avec email puis connexion username réelle, déconnexion, entrée invité et recharge conservant l'acteur. Erreur auth ⇒ message traduit et aucune redirection de succès.
- [ ] Exécuter `pnpm test:e2e` contre l'application locale et sa base jetable : échecs attendus pour les parcours absents.
- [ ] Implémenter des routes fines, la composition et les formulaires accessibles. `next-intl` porte routage/cookie de préférence ; `next-themes` et les tokens portent réellement les deux thèmes, avec sélecteur différé jusqu'au montage. Fournir états pending/error et empêcher les doubles soumissions. Aucun écran « mot de passe oublié ».
- [ ] Rendre les providers absents indisponibles avec explication traduite, jamais faussement réussis. Pour un invité connecté, indiquer que la conversion n'est pas proposée et demander une déconnexion explicite avant le parcours compte ; ne pas relier ni supprimer son identité. Aucun bouton de création/entrée de salon présenté comme opérationnel.
- [ ] Ajouter et passer les tests : doubles clics, erreur puis nouvelle tentative, navigation Retour/Avancer, locale invalide ⇒ FR ou 404 maîtrisé, clavier et viewport mobile, état invité après visite auth. Exécuter `pnpm test:unit && pnpm test:e2e && pnpm build`. Capturer les preuves visuelles clair/sombre FR/EN ; commit local `feat: add bilingual identity screens and themes`.

### Task 5: Contrats de salon et frontières vérifiées

**Files:** créer `src/modules/lobby/public.ts`, `src/modules/lobby/contracts/lobby.ts`, `src/modules/lobby/domain/lobby-actor.ts`, `src/modules/lobby/supervisors/interfaces/lobby-supervisor.ts`, `src/modules/lobby/repositories/interfaces/lobby-repository.ts`, `tests/unit/{lobby-contracts,import-boundaries}.test.ts`, `scripts/check-boundaries.mjs`, `docs/architecture.md`.

**Interfaces:** `LobbyActor = { playerIdentityId: string }` appartient au module salon ; la composition future le construit depuis `Actor`. `CreateLobbyInput = { name: string }` ; `CreatedLobby = { lobbyId: string; code: string; hostPlayerIdentityId: string }` ; `LobbySupervisor.createLobby(input: CreateLobbyInput, actor: LobbyActor): Promise<OperationResult<CreatedLobby>>` ; `LobbyRepository.createWithHost(input: CreateLobbyInput, actor: LobbyActor): Promise<OperationResult<CreatedLobby>>`. Interfaces seulement : aucun export runtime qui prétend créer un salon.

- [ ] Écrire les tests de type : le contrat exige un acteur explicite et un résultat discriminé, jamais un booléen ; n'introduire aucune limite de 32 participants. Écrire des fixtures d'import qui refusent module→module/app/composition, shared→module et client→server-only, tout en acceptant composition→API publique serveur.
- [ ] Exécuter `pnpm test:unit -- tests/unit/lobby-contracts.test.ts tests/unit/import-boundaries.test.ts` : échec avant contrats et vérificateur.
- [ ] Implémenter contrats et contrôle d'import. Documenter l'opération future `composition/lobby/actions/create-lobby.action.ts`, la validation serveur, transaction salon/code/hôte, unicité `(lobbyId, playerIdentityId)`, collisions réessayées de façon bornée, futur transport autoritaire et resynchronisation par version. Ne créer ni cette action non fonctionnelle, ni container/serveur/repository factice.
- [ ] Exécuter `pnpm check:boundaries && pnpm test:unit && pnpm typecheck` : tous verts, y compris fixtures négatives rejetées. Commit local `docs: establish lobby contracts and module boundaries`.

### Task 6: CI, démarrage propre et remise pour revue

**Files:** créer `.github/workflows/ci.yml`, `README.md`, `docs/verification.md` ; finaliser `package.json`, `.env.example`, configuration Playwright, fichiers de tâche 2 nécessaires au PostgreSQL de test.

**Interfaces:** workflow `pull_request` et `push` sur `main`, service PostgreSQL éphémère avec healthcheck, versions Node/pnpm identiques au local, secrets de test générés à chaque job. Aucun accès prod requis. Les scripts de CI et de README sont ceux de la carte des commandes.

- [ ] Écrire la checklist exécutable dans `docs/verification.md` : installation propre, migrations depuis zéro, contrôles statiques, tests unitaires/intégration/navigateur et build. Exécuter sur une copie de travail propre avant ajout CI : enregistrer les commandes manquantes/échecs, sans les déclarer passés.
- [ ] Implémenter CI : `pnpm install --frozen-lockfile`, `pnpm db:validate`, `pnpm db:generate`, `pnpm db:migrate:test`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm test:unit`, `pnpm test:integration`, `pnpm build`, installation navigateur Playwright puis `pnpm test:e2e`. Faire pointer E2E vers le build de production local. En cas d'échec, conserver uniquement rapports nettoyés de secrets.
- [ ] Documenter prérequis, variables vides à renseigner, génération locale de secrets de développement, migration, lancement et tests. Expliquer email obligatoire, absence de récupération et de conversion invité, garanties/limites de session, providers optionnels et callbacks `/api/auth/callback/github` et `/api/auth/callback/discord`. Distinguer clairement tests mock/configuration et OAuth réel non testé.
- [ ] Prouver localement qu'un test volontairement cassé fait échouer la même chaîne de contrôles, le restaurer, puis exécuter toute la chaîne sur l'état final. Ne pas publier de commit volontairement cassé. Nettoyer la base jetable avec `pnpm db:test:down`.
- [ ] Faire vérifier toute la branche par un reviewer indépendant, corriger ses constats prouvés, puis relancer les contrôles affectés et l'agrégat final. Consigner passé/échoué/non exécuté, captures et limites dans `docs/verification.md`. Commit local `ci: verify reproducible typing foundation` ; remettre diff, commits, instructions de démarrage et preuves. Une CI distante ne peut être déclarée verte qu'après exécution sur le commit exact, si publication ultérieurement autorisée.

## Exécution et arrêt

Recommandation : **exécution native par un seul worker**, avec `superpowers:executing-plans`, puis revue indépendante de toute la branche. Auth, schéma, résolution d'acteur et UI partagent des interfaces étroites ; les garder dans un contexte cohérent évite des intégrations inutiles pour ce premier socle.

Présenter ce plan à l'utilisateur et obtenir sa revue ainsi que le choix d'exécution/environnement avant de coder. L'approbation du périmètre et de Better Auth est déjà acquise ; aucune nouvelle question d'architecture n'est nécessaire. L'absence actuelle de Mac connecté n'empêche pas la revue du plan.

Arrêt du lot : squelette local vérifié et revue effectuée, avec limites signalées. Les véritables callbacks OAuth attendent les secrets autorisés ; salons, course, transport, publication et déploiement restent hors périmètre. Aucun résultat applicatif n'est annoncé comme déjà exécuté par ce plan.
