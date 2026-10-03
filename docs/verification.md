# Vérification du socle Sprint 1

## Référence courante vérifiée — 3 octobre 2026, 19 h 29 UTC

La référence de ce rapport est le commit fusionné sur main [`66787c07d6fb691419c76e9c736370a03673583c`](https://github.com/Ap0llonn/web5-multiplayer-typing/commit/66787c07d6fb691419c76e9c736370a03673583c), arbre `c6e0735e8549e68b7927f60d65e34499560b533e`. Les métadonnées des deux runs, les états de leurs jobs et leurs journaux ont été relus le 3 octobre 2026. Tous portent sur ce SHA exact ; aucune modification ultérieure n’est incluse dans les comptes ci-dessous.

- **Quality : succès**, [run 37146692723](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37146692723), [job verify 111272000373](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37146692723/job/111272000373), job terminé à 19:10:00 UTC
- **Local infrastructure : succès**, [run 37146692732](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37146692732), [job compose 111272000567](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37146692732/job/111272000567), job terminé à 19:07:47 UTC

Il s’agit de contrôles automatisés sur des services locaux jetables en CI, pas d’une preuve de déploiement public. **Le checkpoint et le Sprint 1 ne sont pas déclarés entièrement conformes.**

### Résultats sur cette référence

| Contrôle | Résultat | Preuve et portée |
| --- | --- | --- |
| Installation verrouillée | PASS dans les deux workflows | `pnpm install --frozen-lockfile`, versions Node/pnpm du dépôt |
| Prisma et migrations | PASS dans Quality | Validation, génération et application des deux migrations sur PostgreSQL 18.4 jetable ; présence des migrations et contraintes vérifiée en intégration |
| Lint, types et frontières | PASS dans Quality | ESLint, `next typegen`, `tsc --noEmit`, contrôle des imports modulaires |
| Unitaires | **44/44, 13 fichiers** | Contrats, configuration, identité, règles de salon, roster FR/EN, ordre des snapshots, récupération après conflit, heartbeat, SSE et frontières |
| Intégration PostgreSQL | **20/20, 11 fichiers** | Auth locale/invité, sessions, concurrence, capacité/unicité, collisions, présence observée/renouvelée, autorisations, migrations et seed S1 |
| Build de production | PASS dans Quality | Next.js, routes FR/EN, auth, salons et SSE |
| Smoke HTTP/SSE de production locale | PASS dans Quality | Sessions réelles, refus invité/CSRF/acteur falsifié, création/entrée, flux partagé, identité après reconnexion et refus après révocation |
| Chromium et Playwright | **14/14, 4 fichiers** | Projet `chromium` / Desktop Chrome, un worker, aucun retry ; vrai build et PostgreSQL jetable |
| Configuration Docker Compose | PASS dans Local infrastructure | `pnpm infra:validate` appelle réellement Docker Compose ; images épinglées, ports loopback, healthchecks et volumes vérifiés |
| Services et persistance Docker Compose | PASS dans Local infrastructure | `pnpm test:compose` : PostgreSQL, Redis, aller-retour PNG S3 authentifié, refus de lecture anonyme 403, données conservées après `down` puis `up` |

La relecture statique de l’arbre épinglé ne trouve aucun fichier `.js`/`.jsx` versionné ; `tsconfig.json` active `strict`, ESLint interdit `any` explicite et les deux `@ts-expect-error` de `tests/unit/operation-result.test.ts` portent chacun leur justification. Ce contrôle de sources complète le lint/types vert, sans prétendre scanner l’historique des secrets.

Le journal Quality donne `44 passed` à 19:07:44 UTC, `20 passed` à 19:08:01 UTC, le smoke HTTP réussi à 19:08:26 UTC puis `14 passed` à 19:09:56 UTC. Le journal Compose confirme la configuration à 19:06:58 UTC et le smoke de persistance à 19:07:41 UTC. Le job Compose est indépendant de Quality : Redis/S3 restent des services de développement, sans intégration métier photo/cache démontrée.

### Portée exacte des 14 scénarios Chromium

Sources : [`sprint.spec.ts`](../tests/e2e/sprint.spec.ts) (4), [`lobby-acceptance.spec.ts`](../tests/e2e/lobby-acceptance.spec.ts) (3), [`presence.spec.ts`](../tests/e2e/presence.spec.ts) (1), [`ui-acceptance.spec.ts`](../tests/e2e/ui-acceptance.spec.ts) (6) et [`playwright.config.ts`](../playwright.config.ts).

1. **Socle, 4 scénarios :** FR→EN, sombre persistant après reload et accueil sans débordement à 360 × 780 ; deux vraies sessions compte/invité avec création, entrée, roster partagé, reload sans doublon et départ ; mauvais login avec erreur traduite sans faux succès ; réponse initiale `/api/lobbies/me` retardée qui ne peut effacer une création récente. Cette dernière réponse est interceptée pour rendre la régression déterministe.
2. **Salons, 3 scénarios :** un onglet périmé tente une autre salle, retrouve la salle réellement active, affiche le conflit et exige le bouton Quitter avant une nouvelle entrée. Le test accepte uniquement le join tenté et les heartbeats de la salle retrouvée avant ce départ ; il vérifie ensuite les trois onglets/contextes sans adhésion supplémentaire. En FR et EN, un hôte spectateur laisse deux places participantes ; les codes invalides/inconnus, salle pleine puis fermée rendent les erreurs attendues sans affichage de faux salon ni navigation de succès.
3. **Présence, 1 scénario :** les lignes nominatives distinguent compte/invité et hôte, avec libellés FR/EN. Chromium coupe réellement le réseau du contexte invité puis du contexte hôte ; le pair voit Reconnecting puis Online. Le retour intervient en moins de 30 secondes, avec même code, deux membres, identités et hôte inchangés. Mesures de ce run localhost : arrivée **826 ms** ; invité détecté hors ligne à **9 834 ms**, revenu à **15 168 ms** ; hôte détecté à **10 333 ms**, revenu à **14 646 ms**. Ce sont les observations d’un run, pas un engagement de latence ni un test de charge/proxy.
4. **Préférences, 1 scénario :** `/` suit `en-US` et le thème système sombre ; le choix explicite français/clair persiste après reload et nouvelle entrée sur `/`. Accueil, login et signup conservent les contrôles, titre, description et langue française ; aucune erreur d’hydratation ciblée/pageerror sur ce parcours. Une nouvelle session `es-ES` avec système clair utilise le repli FR/clair. Les assertions de classe après `DOMContentLoaded` ne mesurent pas le premier paint : **l’absence de flash visuel reste à vérifier**.
5. **Clavier, 1 scénario :** à 360 × 780, Tab/Entrée activent le lien d’évitement et parcourent l’inscription avec assertions de focus ; l’outline du champ identifiant n’est pas `none`. Une salle au nom de 60 caractères reste dans la largeur, puis le bouton Quitter reçoit le focus et est activé au clavier. La création utilise encore les actions Playwright fill/click ; ce test n’est pas une recette intégrale de toutes les actions au clavier.
6. **Pages et accessibilité, 4 scénarios FR/EN × clair/sombre :** accueil, login, signup, accueil connecté/formulaire de création puis salon ne débordent pas à 360 × 780. Les pages vérifient notamment titre, un `main` et un `h1`. Les analyses axe avec tags WCAG 2 A/AA et 2.1 A/AA ne trouvent aucune violation dans les états parcourus. Elles apportent une preuve automatisée incluant les contrôles de contraste disponibles ; **elles ne certifient pas une conformité WCAG exhaustive**, tous les états d’erreur, les alternatives des futures images ou la lecture réelle par technologies d’assistance.

### Seed et présence désormais couverts

Le seed [`prisma/seed-s1.ts`](../prisma/seed-s1.ts) et ses [3 tests PostgreSQL](../tests/integration/seed-s1.test.ts) sont présents et verts sur cette référence. Deux utilisateurs synthétiques sans credentials/sessions, leurs identités et une salle fermée aux adhésions inactives sont créés de façon répétable et concurrente. Les données étrangères restent intactes, une collision de fixture provoque un rollback complet et les cibles production/distantes/non nommées sont refusées avant connexion sans exposer leur URL. Le corpus, le jeu de données final et l’historique de course restent futurs ; ce seed n’est pas un compte démo connectable.

Les [tests d’observation de présence](../tests/integration/presence-observation.test.ts) prouvent que les lectures ne renouvellent pas `lastSeenAt`, que seul le heartbeat de l’acteur vérifié renouvelle son adhésion et que l’hôte expiré est réconcilié. Ils vérifient les refus d’acteur falsifié, origine étrangère, session révoquée et codes de salle étrangers/inconnus pour heartbeat/départ. Le roster et sa traduction ont aussi des [tests unitaires dédiés](../tests/unit/lobby-roster.test.tsx). La validation de la présence du lobby ne prouve ni la reprise/abandon d’une course future ni son débit cible.

### Limites encore ouvertes sur la référence courante

- Callbacks OAuth GitHub **et** Discord réels, y compris annulation/erreur fournisseur : non vérifiés
- VPS public HTTPS, certificat, proxy SSE, redémarrage et version réellement déployée : non attestés par localhost/CI ou Docker Compose
- Nom, logo, croquis et direction artistique finale créés par l’étudiant : apport humain encore requis
- Absence de flash au premier paint, revue visuelle manuelle, accessibilité exhaustive, lecture assistée, tous les parcours clavier et autres moteurs Firefox/WebKit : non établis
- Login local réussi dans le navigateur, Retour/Avancer et tous les cas de double clic/interruption : restent à compléter ; le login local réussi est couvert en intégration HTTP
- Limite IP des tentatives de code : implémentation présente, mais recette de seuil/concurrence et proxy de production non prouvée par les tests de cette référence ; ne pas confondre avec le test de rate limit du login
- Course, scoring, bots exécutables, bonus, corpus, photos, statistiques/historique, annuaire public et invitations privées : futurs ; Lighthouse et charge/capacité de production non validés

### Reproduire sans confondre les environnements

Suivre les commandes du [README](../README.md) et le [guide local](DEVELOPPEMENT-LOCAL.md). Les harnais `test:integration`, `test:http` et `test:browser` créent leur PostgreSQL local jetable. En CI, Quality migre son service PostgreSQL dédié, puis exécute directement Vitest intégration, le build, le smoke HTTP et Playwright. Le smoke Compose utilise son propre projet jetable et ses volumes, indépendamment des données de développement. Aucun de ces contrôles n’autorise un reset ou un seed de production.

## Lecture de l’historique

Les sections suivantes sont conservées comme preuves **historiques de leurs commits**. Leurs comptes de tests et mentions « à confirmer », « non exécuté » ou « seed séparé » ne décrivent plus la référence courante ci-dessus. Les blocages Docker/Chromium locaux ont été suivis par les deux workflows verts ; les preuves distantes ne prétendent pas que ces commandes ont ensuite fonctionné dans l’ancien environnement local.

## Historique — lot infrastructure locale du 3 octobre 2026, 16 h 48 UTC

Branche `chore/s1-local-dev-compose`, préparée depuis main `216ea62771fb299be8e2f3380bf024ce9789418c`. Ce lot ajoute uniquement l’infrastructure de développement et sa vérification ; aucun code métier, schéma Prisma ou parcours photo n’est modifié.

- **PASS local :** installation verrouillée, Prisma validate/generate, génération des routes, lint, types et frontières ; **27 unitaires** (dont 4 pour le contrat Compose), **17 intégrations PostgreSQL**, migrations depuis zéro puis rejouées, build et smoke HTTP/SSE
- **Régression testée :** le test de configuration Compose échoue avec le validateur non implémenté, puis passe avec la validation ; cas négatifs pour exposition réseau publique, ancien emplacement PostgreSQL, ports supplémentaires, volumes anonymes, healthchecks manquants et tag `latest`
- **PASS syntaxique uniquement :** YAML du Compose et du workflow chargé sans erreur ; ce contrôle ne remplace pas Docker Compose
- **BLOQUÉ local :** `pnpm infra:validate` échoue avant tout démarrage avec `spawnSync docker ENOENT` ; aucun Docker/Podman disponible. Le smoke des services et leur persistance n’ont donc pas été exécutés ici
- **BLOQUÉ local :** les quatre scénarios Playwright échouent au lancement de Chromium absent, avant de tester l’application. La tentative d’installation officielle échoue avec des archives ZIP invalides ; aucune validation navigateur locale revendiquée
- **Revue indépendante :** aucun constat bloquant ; documentation corrigée pour distinguer les clés S3 chargées depuis l’environnement des identités gérées dans le filer
- **À confirmer après publication :** le workflow `Local infrastructure` effectue la validation réelle Docker, un aller-retour PNG S3 signé/refus anonyme et la persistance PostgreSQL/Redis/S3 après `down`/`up`. Le workflow `Quality` fournit les contrôles applicatifs et Chromium sur ce commit ; aucun résultat distant n’est anticipé

Guide et commandes : [DEVELOPPEMENT-LOCAL.md](DEVELOPPEMENT-LOCAL.md). Les preuves de main ci-dessous restent celles de leurs commits historiques et ne constituent pas une preuve Docker.

## Historique — CI main du 3 octobre 2026, 14 h 02 UTC

Le run GitHub Actions **Quality sur main est entièrement vert** : [37128079856](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37128079856), terminé à 14:02:21 UTC, commit [`80b7a5c2c36b800478f04cd40a3082a0df8f3cbb`](https://github.com/Ap0llonn/web5-multiplayer-typing/commit/80b7a5c2c36b800478f04cd40a3082a0df8f3cbb). Les métadonnées du run, les étapes du job et son journal ont été relus le 3 octobre. L'arbre Git vérifié est `3b9d277b223442496576c8dcc921972c6380e84a`, identique à l'arbre local `e729549176208afe3d44038e4e6459885f889f9d` avant cette mise à jour documentaire.

Les runs finaux de branche [push 37127859101](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37127859101) et [PR 37127861683](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37127861683), associés à `f4799f2f89abd3a4d7a99ec48f4433c346cef02f`, sont également terminés avec succès. Les PR [#29](https://github.com/Ap0llonn/web5-multiplayer-typing/pull/29) et [#30](https://github.com/Ap0llonn/web5-multiplayer-typing/pull/30) ont été fusionnées par l'étudiant. Cette validation technique **ne signifie pas que le checkpoint entier est conforme**.

### Résultats du run main

| Contrôle | Résultat | Preuve et portée |
| --- | --- | --- |
| Installation verrouillée | PASS | `pnpm install --frozen-lockfile`, Node/pnpm versionnés |
| Prisma et migrations | PASS | Validation, génération et application des migrations sur PostgreSQL 18.4 jetable |
| Lint, types et frontières | PASS | ESLint, `next typegen`, `tsc --noEmit`, contrôle des imports modulaires |
| Unitaires | **23/23, 8 fichiers** | Contrats, configuration, identité, règles de salon, SSE, état client et fixtures négatives d'architecture |
| Intégration PostgreSQL | **14/14, 9 fichiers** | Auth locale/invité, sessions, identité concurrente, transactions/capacité/unicité, collisions, présence et migrations |
| Build de production | PASS | Next.js, routes FR/EN, auth, salons et SSE |
| Smoke HTTP/SSE de production locale | PASS | Sessions réelles, refus invité/CSRF/acteur falsifié, création/entrée, flux partagé et fermeture après révocation |
| Installation Chromium et Playwright | **4/4, Chromium Desktop Chrome** | Vrai navigateur sur le build et la DB jetable ; aucun retry configuré |

### Ce que les quatre scénarios navigateur prouvent exactement

Source : [`tests/e2e/sprint.spec.ts`](../tests/e2e/sprint.spec.ts), configuration [`playwright.config.ts`](../playwright.config.ts).

1. Depuis `/fr`, passage à `/en`, choix du thème sombre conservé après reload, titre anglais visible et aucune erreur `pageerror` sur ce parcours. À 360 × 780, l'accueil n'a pas de débordement horizontal.
2. Deux contextes Chromium distincts : inscription locale de l'hôte, création d'une salle, session invitée avec pseudo, entrée depuis le champ code, apparition de l'invité chez l'hôte, reload sans adhésion supplémentaire puis départ visible chez l'hôte.
3. Mauvais identifiant/mot de passe : erreur anglaise exacte dans `main`, maintien sur login et bouton réactivé. L'annonceur de navigation Next.js ne sert plus de faux positif.
4. Une réponse initiale `/api/lobbies/me` volontairement retardée ne supprime pas la salle créée entre-temps. Seule cette réponse est interceptée ; ce scénario teste la régression d'état client, pas une panne réseau réelle.

Ces scénarios **ne prouvent pas** un parcours clavier complet, les contrastes AA, les alternatives de toutes les images, tous les formulaires et la salle à 360 px, le thème système/clair et l'absence de flash visuel, une inspection visuelle/captures, Firefox/WebKit, Retour/Avancer, plusieurs onglets d'une même session ou une coupure réseau chronométrée. Le test FR→EN avec reload reste sur `/en` : la priorité du cookie de langue lors d'une nouvelle entrée sur `/` n'y est pas isolée. La détection `Accept-Language: en-US` est vérifiée séparément par le smoke HTTP. Une connexion locale réussie par identifiant/mot de passe est testée en intégration ; l'E2E crée un compte local mais ne teste pas encore ce login réussi dans le navigateur.

### Limites encore ouvertes

- GitHub **et** Discord : callbacks OAuth réels non vérifiés ; les tests de comptes locaux ne les remplacent pas
- VPS public HTTPS : aucun déploiement ni certificat/proxy en production attesté ; la CI utilise localhost
- Nom, logo, croquis et direction artistique finale : apports humains manquants ; aucun nom/logo créé par IA
- Seed S1 sûr et idempotent : livraison séparée suivie dans [#4](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/4), non couverte par ce run main ; corpus, utilisateurs et historique complets restent à construire pour la finale
- Course, scoring, bots exécutables, bonus, corpus, photos, statistiques/historique, annuaire public et invitations privées : futurs
- Accessibilité exhaustive, revue visuelle/mobile, Lighthouse, charge SSE/course et capacité opérationnelle en production : non validés

Les sections datées ci-dessous conservent les premiers résultats, blocages et échecs pour la traçabilité. Leurs mentions « navigateur non exécuté », « CI non vérifiée » et « à confirmer » décrivent **leur date historique**, et sont remplacées pour l'état courant par les résultats verts ci-dessus. Aucun échec ancien n'est effacé ; aucune preuve future n'est anticipée.

## Historique — vérification locale de 13 h 23 UTC

3 octobre 2026, 13 h 23 UTC. Code vérifié : `f0e0563a2ef278f166348055af04d59e05f1310c`, branche `sprint1/foundation`. Aucun push, merge ou déploiement de production effectué. Revue indépendante effectuée ; ses deux constats importants ont été corrigés et couverts par des tests de régression.

## Contrôles exécutés

| Contrôle | Résultat | Périmètre prouvé |
| --- | --- | --- |
| pnpm install --frozen-lockfile | PASS | Lockfile et dépendances installables dans l'environnement cloud |
| pnpm db:validate ; pnpm db:generate | PASS | Schéma Prisma valide et client généré |
| pnpm lint | PASS, zéro avertissement | ESLint, no-explicit-any en erreur |
| pnpm exec next typegen ; pnpm typecheck | PASS | TypeScript strict et routes générées |
| pnpm check:boundaries | PASS | AST imports, frontières intermodules, private entries, public type-only, transitivité client/serveur |
| pnpm test:unit | PASS, 23 tests / 8 fichiers | Contrats, configuration, traduction d'erreurs, identité et règles de salon ; fixtures négatives d'architecture |
| pnpm test:integration | PASS, 13 tests / 9 fichiers | PostgreSQL18.4 réel jetable ; auth HTTP, invité/pseudo, sessions, identité concurrente, contraintes/transactions salon, création concurrente, dernière place, expiration/recréation |
| Migration DB vide puis seconde application | PASS | Deux migrations appliquées puis « No pending migrations » |
| pnpm build | PASS | Build Next de production, routes FR/EN/auth/lobby/SSE |
| pnpm test:http | PASS | Vrai serveur Next du build de production + PostgreSQL ; deux sessions distinctes, FR/EN HTML, détection langue navigateur, cookies HttpOnly, CSRF, validation stricte, création/entrée, SSE réel, idempotence, session révoquée |
| Mutation volontaire d'une assertion | ÉCHEC ATTENDU puis restaurée | La commande test:unit retourne 1 pour une régression, puis suite finale verte |
| Scan première partie | PASS | Aucun .js/.jsx dans les sources/configs/scripts livrés ; sorties générées et dépendances exclues |

Les tests utilisent le handler officiel Better Auth et une vraie DB ; les deux parcours OAuth externes ne sont pas simulés comme une preuve réelle. Les URL de DB externes ne sont jamais utilisées par le harnais embarqué. Chaque stack temporaire est arrêtée et supprimée après son run.

## Limites explicites

- Playwright : 4 scénarios écrits (préférences/mobile, deux navigateurs salon/reconnexion, erreur login, réponse initiale retardée), **non exécutés fonctionnellement**. Lancement Chromium bloqué par `socket() failed: Operation not permitted`. Le chemin de téléchargement du navigateur a également échoué. Le navigateur cloud séparé ne peut pas ouvrir localhost (`ERR_BLOCKED_BY_CLIENT`). Aucune restriction contournée.
- Donc pas de preuve navigateur de persistance thème, hydration, clavier, contrastes, mobile360px ou captures. Le HTTP/HTML/SSE vert n'est pas un remplacement de ces preuves.
- Workflow GitHub Actions présent à chaque push et PR, mais **aucun run distant vérifié** à ce stade. Il inclut navigateur Playwright avec PostgreSQL éphémère.
- GitHub et Discord : configuration/env/UI fournis, callbacks OAuth réels **non testés** faute de credentials autorisés.
- VPS HTTPS et domaine : **non déployés**, pas d'URL publique ni de recette de proxy/certificat.
- Nom/logo/croquis et direction artistique finale : attendent le travail de l'étudiant ; titre fonctionnel neutre et UI simple uniquement.
- Pas de course, scoring, bonus, bots exécutables, corpus seed, photo, stats/historique, annuaire public ou invitations privées. Conception de course/bots présente ; exigences finales suivies dans EXIGENCES.
- Charge du SSE et déploiement doivent être mesurés avant validation ; aucune promesse de capacité opérationnelle par un simple test local.

## Reproduction

Suivre README. Pour les commandes d'une machine qui fournit déjà une DB jetable (CI), appliquer les migrations, exécuter Vitest intégration, build puis smoke HTTP et Playwright. Les suites locales autonomes créent leur propre PostgreSQL et ne réutilisent pas une DB de production. Le runner du navigateur doit autoriser les sockets nécessaires à Chromium.

## Décisions d'implémentation

- PDF le plus récent prioritaire : invités sans création, capacité2–30, rôle hôte libre, langue navigateur et thème système. L'ancien plan « contrats seuls » est dépassé par l'autorisation Sprint1.
- SSE+HTTP pour le salon S1 ; version durable et snapshot complet sur reconnexion. Course future pourra employer WebSocket selon mesures ; pas de prétention de4Hz course actuellement.
- Monolithe modulaire conservé ; moteur auth officiel constitue l'exception protocolaire documentée.
- PostgreSQL de tests embarqué pour l'exécution locale ; service PostgreSQL en CI. Pas de Docker requis dans ce cloud.
- HTTP en mode production permis seulement sur loopback pour tester le build local ; HTTPS obligatoire pour toute origine distante.
- Version Prisma7 stable, toolchain TypeScript5.9/ESLint9 conservé pour les peer-dependencies. ESLint9 signale une fin de maintenance upstream ; mise à jour cohérente de ses plugins à suivre.

## Corrections après revue indépendante

1. Contention présence à30 membres : échec reproduit avant correction (15–17 conflits par rafale). Les écritures de présence deviennent indépendantes, avec verrou partagé de salon ; les commandes structurelles prennent un verrou exclusif. Test intégré : quatre rafales de30, aucune erreur et30 adhésions conservées. Script indépendant du reviewer rejoué : 30/30 sur chacune des quatre rafales,43–56ms dans ce cloud. Les tests dernière place/unicité restent verts.
2. Réponse initiale retardée : un chargement /me ancien pouvait effacer une création/entrée récente. Régression déterministe RED→GREEN sur le reducer de génération ; un vieux stream ne peut plus ressusciter un salon quitté. Scénario Playwright ajouté pour CI, sans prétendre qu'il a tourné ici.
3. Erreurs SSE transitoires : contention/panne temporaire conserve l'état et réessaie, y compris pendant l'ouverture ; la révocation réelle arrête le stream. Tests de transport RED→GREEN et smoke HTTP avec révocation alors que le stream reste ouvert.
4. Couverture supplémentaire : collisions de code imposées, succès après retry, plafond de5 tentatives, aucun salon/adhésion orphelin après rollback.

Suite finale après corrections :23/23 unitaires,13/13 intégrations, types/lint/frontières/build et smoke HTTP/SSE réussis. Aucune nouvelle preuve navigateur, OAuth ou VPS n'est revendiquée. Pas de second passage de revue annoncé ; les corrections sont vérifiées par les régressions et l'agrégat final.

## Correction après les premiers runs CI — 3 octobre 2026, 13 h 45 UTC

Les premiers runs distants sur `9566ea1` ont apporté de nouvelles preuves : le run push a passé intégration, build et smoke HTTP, puis3/4 scénarios Playwright ; le parcours signup→salon a échoué. Le run PR a échoué sur la résolution concurrente d'identité. Références : [push37126726065](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37126726065) et [PR37126790872](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37126790872).

Bug identité reproduit localement en RED avec12 utilisateurs nouveaux et8 résolutions concurrentes chacun. L'upsert Prisma avec update vide peut effectuer lecture puis insertion : la contrainte unique laisse un seul gagnant, mais le perdant retournait INTERNAL. Le repository intercepte uniquement P2002 et relit l'identité gagnante ; les autres erreurs restent expurgées. Régression GREEN : toutes les réponses convergent vers le même ID et une seule ligne par utilisateur.

Le défaut navigateur est traité séparément : son log DB montre la même contrainte au moment du signup, mais le test HTTP de8 rendus home concurrents ne reproduisait pas le défaut avant correction. Aucune modification spéculative de navigation. Les assertions Playwright distinguent maintenant succès signup, URL finale, alerte et formulaire ; les prochains échecs conservent uniquement le contexte DOM, pas les traces réseau contenant des cookies. La disparition du défaut navigateur reste à confirmer par le prochain run distant.

Vérifications locales après correction :23 unitaires,14 intégrations PostgreSQL, lint/types/frontières, build et smoke HTTP/SSE réussis. Le secret jetable de CI est désormais masqué avant export dans GITHUB_ENV ; aucun credential de production concerné. Les anciens résultats navigateur partiels ne prouvent ni OAuth ni VPS.

### Correction du sélecteur Playwright — 13 h 54 UTC

Sur les runs push37127372748 et PR37127525137 du correctif, intégration/build/HTTP passent. Le contexte DOM retenu confirme signup200, URL/en, utilisateur connecté et formulaire Room name visible. L'unique alerte est vide, après le footer. Le code Next16.3.8 installé crée précisément un annonceur de navigation accessible `role=alert` hors du landmark main. L'assertion globale ajoutée pour diagnostiquer les erreurs comptait cet annonceur.

Correction ciblée des tests uniquement : rechercher les erreurs dans main. Le test de mauvais mot de passe exige désormais le texte traduit réel, empêchant aussi un faux positif dû à l'annonceur. La navigation et le composant d'accessibilité restent inchangés. Lint/types/frontières, collection des4 tests Playwright,23 unitaires et14 intégrations passent localement ; exécution navigateur complète à confirmer par CI.
