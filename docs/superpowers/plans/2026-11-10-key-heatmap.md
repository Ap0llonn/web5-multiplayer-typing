# Key heatmap implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter au profil une carte des caractères avec modes erreurs et fréquence, conformément à la conception approuvée dans le chat.

**Architecture:** Lobby collecte les caractères insérés acceptés par le serveur, sans ordre de frappe, et persiste des compteurs par résultat humain. La composition fournit les statistiques privées au composant public lobby. Aucun import entre modules.

**Tech Stack:** TypeScript strict, Prisma/PostgreSQL, React, Tailwind, next-intl.

**Spec:** Conception approuvée dans le chat : deux modes, détails au survol/toucher, cumul des nouvelles courses, FR/EN, clair/sombre, anciennes courses exclues.

## Global Constraints

- Session réelle et identité serveur pour le profil.
- Compteurs uniquement dans la course ; aucune écoute globale du clavier.
- Caractères saisis (minuscules regroupées), pas codes physiques du clavier ; accents et ponctuation conservés.
- Erreurs = proportion incorrecte des insertions de ce caractère. Fréquence = nombre d'insertions.

## Review Focus

- Anciens résultats : absence de données distincte de zéro.
- Réémission d'un lot : aucun double comptage.
- Effacement/correction : erreurs historiques conservées.
- Caractères accentués et symboles : visibles même hors clavier principal.
- Confidentialité : aucun compteur d'un autre profil.

### Task 1: Collection et persistance

Files: contracts/race.ts, contracts/race-schemas.ts, domain/race-rules.ts, domain/key-statistics.ts, repositories/implementations/race-storage.ts, profile-metrics.ts, prisma/schema.prisma et migration ; tests/unit/key-statistics.test.ts, tests/integration/race.test.ts.

Interfaces: KeyStatistic { key: string; total: number; errors: number }; RacePlayer.keyStatistics optionnel ; métriques profil keyStatistics et heatmapRaces.

- [x] Écrire les tests de collecte, effacement, lots répétés, mode obligatoire/libre et cumul ; les observer rouges.
- [x] Ajouter les compteurs bornés, schéma validé et champ JSON nullable des résultats.
- [x] Agréger tous les résultats personnels ayant des compteurs ; ajouter preuve de round-trip PostgreSQL et isolation.
- [x] Exécuter les tests ciblés.

### Task 2: Carte du profil et vérification

Files: presentation/race/key-heatmap.tsx, composition/profile/profile-page.tsx, messages FR/EN ; tests unitaires et navigateur.

Interfaces: KeyHeatmap({ statistics: KeyStatistic[], races: number }).

- [x] Tester rendu vide, détails et sélecteur, accents et espace.
- [x] Ajouter clavier de caractères avec extras, légende numérique, détails accessibles au focus et toucher.
- [x] Mettre à jour architecture, exigences et vérification.
- [x] Exécuter lint, typecheck, frontières, unitaires, intégration, build et E2E pertinents ; distinguer blocages environnementaux.

## Execution ledger

Implémentation en session autorisée par « oui vas-y ». Tests ciblés rouges puis verts. Revue indépendante : problème Unicode identifié et corrigé, confirmation du reviewer ensuite. Contrats conservés dans lobby, aucune dépendance croisée. Résultats détaillés dans docs/verification.md.

Ruling: colonne nullable dans RaceResult plutôt que lecture de toutes les archives — cumul personnel direct, préserve les anciennes archives immuables et exclut explicitement les données absentes.
Ruling: caractères saisis plutôt que codes physiques — le protocole de course transporte déjà les insertions validées, sans capturer le clavier hors du jeu.
Ruling: conserver le caractère original quand lowercase produit plusieurs points Unicode — garantit le round-trip des schémas.
