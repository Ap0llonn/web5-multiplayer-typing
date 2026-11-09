# Mystery Boxes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Six objets mystères autoritaires serveur aidant les retardataires pendant la course humaine.

**Architecture:** Règles pures et contrats dans lobby ; mutation via superviseur et transaction de salle existants. Composition HTTP résout la session, UI consomme les snapshots publics.

**Tech Stack:** TypeScript strict, Zod, Prisma/PostgreSQL, React, next-intl, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-mystery-boxes-design.md`

## Global Constraints

- Checkpoints 25/50/75 %, dernier OU >25 points de retard, maximum 3.
- Six effets ; brouillard quatre secondes ; MPM sans frappes offertes.
- FR/EN, clair/sombre ; aucune identité fournie par le navigateur.
- PostgreSQL jetable ; aucune migration de base inconnue ni déploiement.
- Préserver le travail non commité existant ; exécution ici autorisée par l'utilisateur, sans commit automatique.

## Review Focus

- Deux activations concurrentes d'un objet : effet unique sous verrou DB.
- Lot de frappe en vol pendant un changement de texte : révision périmée refusée sans fausse erreur.
- Égalités, passage de plusieurs checkpoints en un lot et recul de progression : aucune attribution double.
- Fin/abandon/déconnexion et cible devenue inutilisable : aucune attaque de résultat figé ni consommation inutile.
- Ancien agrégat JSON : lecture compatible, sans changement silencieux d'une ancienne course.

### Task 1: Domaine et contrats

**Files:** contrats race, schémas, `domain/race-bonuses.ts`, `domain/race-rules.ts`, tests/unit/race-bonuses.test.ts.

**Interfaces:** `distributeMysteryBoxes(race: RaceState, now: number): void`, `useRaceItem(room, actor, input, now): OperationResult<Lobby>`, `RaceUseItemInput = { raceId; itemId }`.

- [x] Écrire les tests distribution unique, égalités, limite trois, six effets, métriques, cible/protection, révision périmée et compatibilité.
- [x] Exécuter `pnpm exec vitest run tests/unit/race-bonuses.test.ts` ; constater RED.
- [x] Implémenter les règles pures, les types/schémas et les snapshots personnels.
- [x] Rejouer les tests du domaine, attendre PASS.

### Task 2: Transport et persistance

**Files:** superviseur race, composition race-http, façades publiques, race-storage, Prisma/migration, tests/integration/race.test.ts et migrations.test.ts.

**Interfaces:** `RaceSupervisor.useItem(code, actor, input)` ; `POST race/item` accepte seulement raceId/itemId.

- [x] Ajouter les tests de schéma strict, appartenance, idempotence concurrente, reprise depuis DB et résultat bonus.
- [x] Observer leur échec, puis câbler la mutation et la migration additive du compteur.
- [x] Exécuter l'intégration sur PostgreSQL jetable, attendre PASS.

### Task 3: Présentation et recette finale

**Files:** composants race (boîtes, inventaire, piste, texte, résultats/réglages), hook de frappe, catalogues FR/EN, tests unitaires UI et tests/e2e/race.spec.ts, architecture/exigences/verification.

**Interfaces:** snapshots versionnés avec inventaire propre, longueur personnelle, révision et événements publics.

- [x] Écrire une régression UI et un scénario navigateur : checkpoint → objet → activation → reload ; spectateur, FR/EN, thèmes, mobile et axe.
- [x] Implémenter présentation traduite, brouillard futur, resynchronisation et comptage des résultats.
- [x] Exécuter lint, typecheck, frontières, unitaires, intégration, build et E2E pertinents.
- [x] Revoir les changements, documenter les résultats effectivement exécutés et les limites.

## Journal

- Accord utilisateur : les six effets et l'implémentation sont autorisés. Réalisation dans l'arbre courant pour conserver la course humaine existante non commitée ; pas de nouvelle demande de permission pour ces travaux réversibles.
- Task 1 : domaine/contrats réalisés ; tests RED avant implémentation, puis 14 tests bonus PASS (dont les deux régressions de frontière de mot et le seuil exact de 25 points).
- Task 2 : transport/persistance réalisés ; test PostgreSQL RED (`useItem` absent), puis 7 tests ciblés et 49 intégrations PASS sur base jetable.
- Task 3 : présentation réalisée ; tests UI/rebase RED puis GREEN. Contrôles finaux : 158 unitaires PASS, lint sans avertissement, types/frontières et build PASS ; 11 E2E PASS. Captures FR sombre/EN clair inspectées.
- Revue indépendante en lecture seule : deux défauts reproduits (frontière exacte d'un mot ; retours arrière après suffixe retiré), tests de régression ajoutés, corrections revérifiées par le reviewer (16 tests ciblés PASS).
- Incident de vérification : le run d'intégration simultané au build dépasse le délai du test seed, son nettoyage ne s'exécute pas et le test seed suivant échoue. Rejouer la suite seule avant conclusion ; ne pas modifier un test de seed sans diagnostic de régression.
- Incident résolu : la suite entière rejouée seule passe 49/49 ; le dernier run sur l'état final est consigné dans verification.md.
- Seuil strict : régression RED pour 55 % − 30 % (arrondi flottant), puis GREEN avec comparaison de produits entiers. Pas d'attribution à exactement 25 points hors dernière place.
- Application locale : cible Compose vérifiée `postgres:5432/typing_dev`, une seule migration en attente ; migration additive appliquée, app redémarrée (régénération Prisma), `/fr` HTTP 200. Aucun compte/salle de test ajouté à cette DB.
