# Single-use room invitation implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline.

**Goal:** Permettre à l'hôte de copier/partager un lien valable une heure pour une seule entrée réussie.

**Architecture:** Lobby possède les règles et digests privés, persistance via la transaction mutate existante. La composition résout l'identité et les transports valident chaque entrée.

**Tech Stack:** TypeScript, Prisma/PostgreSQL, React, next-intl, crypto natif injecté.

**Spec:** docs/superpowers/specs/2026-11-10-single-use-invite.md

## Global Constraints

FR/EN, clair/sombre ; aucun import intermodules ; aucune consommation GET ; aucun jeton dans snapshot/log ; aucune réinitialisation DB.

## Review Focus

- Deux adhésions concurrentes : une seule gagne.
- Capacité/bannissement/conflit : le lien reste disponible.
- Aperçu et page : aucun effet de bord.
- Expiration exacte et réémission : réponse stable et privée.
- Invité : vraie session Better Auth, pseudo validé.

### Task 1: Domaine et persistance

Files: contracts/invitation.ts, domain/invitation-rules.ts, infrastructure/invitation-tokens.ts, superviseur et repository lobby existants, schema/migration ; tests unitaires/integration.

- [x] Écrire et observer rouges les tests création hôte, expiration, usage unique, refus sans consommation, répétition.
- [x] Ajouter le contrat des jetons injectés et les règles appelant joinRoom.
- [x] Ajouter champ JSON privé et persistance sous le verrou existant ; vérifier concurrence sur PostgreSQL jetable.

### Task 2: Transport et présentation

Files: composition/lobby/http.ts, route invitations, présentation room-invite, JoinPlayerForm, messages FR/EN, tests navigateur.

- [x] Valider code/corps/session/origine et quota ; étendre la commande join avec jeton optionnel.
- [x] Afficher générer, lien cliquable, copier/partager ; fragment consommé seulement en POST après authentification.
- [x] Tester le parcours réel à deux destinataires et les deux langues, puis lint/types/frontières/unitaires/intégration/build.
- [x] Revue indépendante, documents et application de migration locale demandée.

## Execution ledger

Tests unitaires observés rouges puis verts ; vérifications détaillées dans docs/verification.md. Revue de conception et revue finale indépendantes effectuées.

Ruling: conserver tous les liens non expirés, y compris consommés, au maximum 50 — préserve la réémission idempotente jusqu’à expiration. L’utilisation est rattachée à joinedAt et à l’identité, et vérifiée sous verrou.
Ruling: migrer depuis le conteneur app local — l’URL du shell cible le mauvais port ; aucune modification de secret. Les deux nouvelles migrations sont appliquées, sans reset.
Incident: les sources sont montées dans le serveur de développement ; application de la migration d’invitation et régénération Prisma immédiatement après le signalement, puis vérification HTTP locale et tests d’écriture sur DB jetable seulement.
