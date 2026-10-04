# Vérification du socle Sprint 1

## Frontend rétro arcade et logo fourni — 4 octobre 2026

Direction : seconde maquette approuvée, puis demande explicite de frontend réutilisable. Logo CLAK! fourni ultérieurement par l’utilisateur, copié sans modification dans `public/brand/clak-logo.png`. Primitives génériques et layouts dans shared, identité de navigation injectée par composition/site ; aucune règle/transaction/route métier modifiée. Références : TECH-03, DES-04/05/06, I18N-01/02, A11Y-01/02/03/04.

| Contrôle final local | Résultat et portée |
| --- | --- |
| ESLint, TypeScript strict, frontières | PASS via exécutables Node locaux, équivalents aux scripts pnpm |
| Unitaires | PASS : 58 tests / 16 fichiers. RED initial : quatre cas démontrent l’absence des régions d’entrée nommées et du shell/footer accessible ; GREEN après extraction. Les gardes d’indisponibilité auth existantes restent couvertes |
| Prisma generate, build Next.js 16.3.8 | PASS : compilation production et routes dynamiques FR/EN/auth/lobby ; configuration auth jetable uniquement |
| Migrations PostgreSQL | PASS : deux migrations depuis zéro, puis second deploy sans migration en attente |
| Intégration PostgreSQL | PARTIEL : 17/20 passent, 3 échecs préexistants dans `seed-s1.test.ts` avec `spawn pnpm ENOENT` sous Windows, avant lancement du seed. Les tests auth, identité, règles/transactions/presence/salle passent |
| E2E de production | PASS : 15/15 en 1,2 minute, moteur Chromium via Edge installé. Vraie DB jetable, vrai build, port 3107 isolé du dev. Compte et invité, entrée/capacité/rôle spectateur, conflits de salle, présence/reconnexion, réponse /me retardée, erreur login, nav après signup/signout, logo chargé deux fois, footer, conservation query/fragment lors du changement de langue, préférences persistées, signup clavier et nom de salle de 60 caractères à 360 px |
| Accessibilité automatisée et responsive | PASS dans les E2E : accueil/login/signup/formulaires/salle FR/EN × clair/sombre à 360 px, aucun débordement ni violation axe WCAG A/AA sur ces scénarios. Cela ne certifie pas les pages futures, l’absence de flash exhaustive ou une recette manuelle complète |
| Revue indépendante | Aucun défaut actionnable sur le frontend ; revue statique, distincte des preuves navigateur |
| Vérification visuelle | Captures anonymes du dev existant : accueil bureau clair/sombre, accueil et inscription à 360 px, inspectées. Elles ne remplacent pas les E2E de production isolés |

### Conditions de reproduction Windows et essais échoués

Le build initial échouait avant compilation avec `ERR_SWC_NATIVE_CACHE` (DACL du cache utilisateur par défaut). Un cache dédié `C:\Users\Sam\swc-cache-clak`, sélectionné par `SWC_NATIVE_BINDING_CACHE` dans le processus de vérification, permet le chargement officiel vérifié et le build. Aucune permission existante, dépendance ou secret utilisateur modifié. Documentation du mécanisme : [SWC native addon carriers](https://github.com/swc-project/swc/blob/main/docs/native-addon-carriers.md). Ce réglage local de vérification n’est pas un changement de configuration produit.

Le harnais habituel `scripts/test-stack.ts` crée son PostgreSQL, puis échoue sur `spawn pnpm ENOENT`. Un harnais temporaire ignoré dans `.data` utilise les mêmes dépendances et migrations via `process.execPath` : il établit les résultats 17 PASS / 3 FAIL ci-dessus. Le premier lancement Playwright refuse correctement le port 3000 déjà occupé ; le second essai échoue avant assertions faute de cwd explicite dans la config temporaire. Après correction du harnais, le run final passe sur 3107, avec `PLAYWRIGHT_BASE_URL` pour les origines des quatre suites. Aucun scénario de mutation E2E exécuté sur la DB de développement. Les stacks temporaires PostgreSQL sont arrêtées et leurs répertoires vérifiés puis supprimés.

**Non exécuté dans ce lot :** OAuth GitHub/Discord réel, déploiement/VPS, charge, callbacks externes, vérification du moodboard/provenance personnelle du nom/logo/croquis et favicon. Aucun statut de conformité complet n’est attribué à ces sujets. Les modifications utilisateur déjà présentes dans le checkout ont été conservées.

## Corrections des pages React et du thème — 3 octobre 2026

Rattachement : `DES-05`, `AUTH-02/03`, `TECH-10`. La composition accueil/auth possède le rendu des échecs ; identity conserve `OperationResult` et l’infrastructure partagée valide la configuration. Les limites de module et les règles de validation des secrets sont conservées.

- **RED → GREEN :** quatre cas login/signup FR/EN reproduisaient l’exception de configuration ; deux cas accueil reproduisaient un formulaire invité proposé malgré une panne. Les pages rendent maintenant une alerte traduite pour les échecs autres que `UNAUTHENTICATED`, sans formulaire trompeur.
- **RED → GREEN :** le diagnostic env ne nommait aucune variable invalide ; il indique maintenant uniquement les clés connues du schéma, sans reprendre les valeurs. L’erreur typée est journalisée par la façade serveur identity et reste `INTERNAL` dans le contrat client.
- **RED → GREEN navigateur :** Edge reproduisait l’avertissement React de script après FR→EN. L’adaptateur next-themes utilise le snapshot serveur pendant l’hydratation initiale et un type inerte `text/plain` ensuite. Les effets officiels du fournisseur continuent d’appliquer les thèmes. Référence primaire : [next-themes #397](https://github.com/pacocoursey/next-themes/issues/397) ; source installée React/next-themes inspectée.
- **PASS :** lint, TypeScript strict et frontières sur les fichiers finaux ; 54 unitaires dans 15 fichiers, dont trois cas exécutant le bootstrap SSR pour le thème système et la priorité des choix clair/sombre. Cela vérifie le bootstrap ; aucune certification exhaustive de l’absence de flash visuel.
- **PASS navigateur en développement :** le scénario Playwright existant de préférences/langue/thème/mobile passe sous Edge installé, sur le serveur local déjà démarré ; il détecte désormais aussi l’avertissement de script dans la console. Contrôle séparé : `/fr/signup` retourne 200 avec l’alerte traduite, FR→EN→FR conserve le thème sombre après reload, aucune exception de page ni avertissement de script. Aucun compte créé et aucune mutation de la DB locale par ces vérifications.
- **PASS intégration :** deux migrations appliquées depuis zéro puis rejouées sur PostgreSQL 18.4 Docker jetable, port loopback attribué automatiquement ; 17 tests passent.
- **ÉCHEC intégration :** les trois tests de `seed-s1.test.ts` échouent avec `spawn pnpm ENOENT` sous Windows, avant d’exécuter le seed. Le rapport n’assimile pas ces échecs à des tests verts. Le conteneur jetable et ses volumes anonymes sont retirés après chaque essai.
- **BLOQUÉ build :** Next.js échoue au chargement SWC avec `ERR_SWC_NATIVE_CACHE`, avant la compilation applicative, même avec une configuration auth valide jetable.
- **NON EXÉCUTÉ :** les trois autres scénarios E2E de production, faute de build validé. La vérification navigateur en développement ne remplace pas cet agrégat.

Le diagnostic local confirme que `BETTER_AUTH_SECRET` ne satisfait pas son schéma. Aucun secret local modifié ou exposé : l’utilisateur doit renseigner une valeur d’au moins 32 caractères dans son fichier local puis redémarrer Next.js. Les contrôles DB utilisent exclusivement des conteneurs de test distincts ; aucune migration sur la DB utilisateur.


## Correction du client Prisma absent au démarrage — 3 octobre 2026

Rattachement : `TECH-04` et préparation locale `DOC-FINAL-README`. Propriétaire : outillage partagé (`package.json`), sans changement de contrat métier, schéma ni migration. Le client ignoré par Git était absent après les migrations ; les imports et le chemin du générateur étaient corrects. `dev` et `build` exécutent désormais `pnpm db:generate` avant Next.js. La génération échouée interrompt le démarrage.

- **Défaut reproduit :** `tsc --noEmit` échoue avec TS2307 sur `src/generated/prisma/client` avant génération.
- **PASS :** `pnpm db:generate` crée `src/generated/prisma/client.ts` ; le script `pnpm build` exécute bien la génération avant Next.js ; lint, TypeScript strict, frontières et 44 tests unitaires dans 13 fichiers passent.
- **BLOQUÉ :** build et essai de démarrage Next.js échouent au chargement natif de SWC (`ERR_SWC_NATIVE_CACHE`) dans cet environnement Windows, avant la compilation applicative. Aucune preuve de démarrage HTTP complet revendiquée.
- **BLOQUÉ :** le harnais d’intégration échoue à l’initialisation de son PostgreSQL temporaire (`initdb`, jeton restreint Windows et chemin temporaire), avant toute migration ou assertion. Aucune base de développement ou de production utilisée.
- **NON EXÉCUTÉ :** E2E, faute de build de production validé.

Les contrôles indépendants ont été lancés via leurs exécutables Node locaux, équivalents aux scripts pnpm, car le compte sandbox n’accède pas au verrou global pnpm. Aucun test unitaire des chaînes de scripts ajouté : la reproduction TypeScript et l’exécution réelle de génération contrôlent le défaut.


## Lot infrastructure locale — 3 octobre 2026, 16 h 48 UTC

Branche `chore/s1-local-dev-compose`, préparée depuis main `216ea62771fb299be8e2f3380bf024ce9789418c`. Ce lot ajoute uniquement l’infrastructure de développement et sa vérification ; aucun code métier, schéma Prisma ou parcours photo n’est modifié.

- **PASS local :** installation verrouillée, Prisma validate/generate, génération des routes, lint, types et frontières ; **27 unitaires** (dont 4 pour le contrat Compose), **17 intégrations PostgreSQL**, migrations depuis zéro puis rejouées, build et smoke HTTP/SSE
- **Régression testée :** le test de configuration Compose échoue avec le validateur non implémenté, puis passe avec la validation ; cas négatifs pour exposition réseau publique, ancien emplacement PostgreSQL, ports supplémentaires, volumes anonymes, healthchecks manquants et tag `latest`
- **PASS syntaxique uniquement :** YAML du Compose et du workflow chargé sans erreur ; ce contrôle ne remplace pas Docker Compose
- **BLOQUÉ local :** `pnpm infra:validate` échoue avant tout démarrage avec `spawnSync docker ENOENT` ; aucun Docker/Podman disponible. Le smoke des services et leur persistance n’ont donc pas été exécutés ici
- **BLOQUÉ local :** les quatre scénarios Playwright échouent au lancement de Chromium absent, avant de tester l’application. La tentative d’installation officielle échoue avec des archives ZIP invalides ; aucune validation navigateur locale revendiquée
- **Revue indépendante :** aucun constat bloquant ; documentation corrigée pour distinguer les clés S3 chargées depuis l’environnement des identités gérées dans le filer
- **À confirmer après publication :** le workflow `Local infrastructure` effectue la validation réelle Docker, un aller-retour PNG S3 signé/refus anonyme et la persistance PostgreSQL/Redis/S3 après `down`/`up`. Le workflow `Quality` fournit les contrôles applicatifs et Chromium sur ce commit ; aucun résultat distant n’est anticipé

Guide et commandes : [DEVELOPPEMENT-LOCAL.md](DEVELOPPEMENT-LOCAL.md). Les preuves de main ci-dessous restent celles de leurs commits historiques et ne constituent pas une preuve Docker.

## État faisant foi — 3 octobre 2026, 14 h 02 UTC

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
