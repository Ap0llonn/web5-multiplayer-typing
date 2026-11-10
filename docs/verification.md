# Vérification du socle Sprint 1

## Migrations au démarrage de production — 7 octobre 2026

Après la résolution du nom PostgreSQL, l’utilisateur signale `TableDoesNotExist` dans Dokploy et demande si le build applique les migrations. Constat : `pnpm build` générait seulement le client Prisma ; le `CMD` de production lançait directement `pnpm start`. Le guide prévoyait une migration manuelle, sans étape automatique. Le correctif remplace ce choix : `Dockerfile` exécute désormais `pnpm exec prisma migrate deploy && exec pnpm start`. Les migrations utilisent la connexion runtime injectée par Dokploy ; le build reste indépendant de la base de production, avec son URL factice. Aucun nouveau SQL ni changement des modules/contrats métier.

Les deux tests de `tests/unit/production-startup.test.ts` exécutent le véritable `CMD` de production avec un CLI externe contrôlé. Avant correction, les deux échouent : le serveur est lancé directement, même dans le scénario d’échec de migration. Après correction, les migrations précèdent le serveur ; un code d’échec de migration est conservé et aucun serveur n’est lancé. Ils vérifient la chaîne de démarrage, sans prétendre prouver une migration PostgreSQL avec ce double. Le shell de l’image étant Linux, ces deux contrôles sont ignorés sur un hôte Windows.

| Contrôle final | Résultat |
| --- | --- |
| Lint, types stricts, frontières, diff | PASS ; imports initiaux de `next-env.d.ts` restaurés après build et types repassés |
| Unitaires | PASS : 96 tests / 28 fichiers, dont les deux nouvelles régressions de démarrage |
| PostgreSQL jetable et intégrations | PASS : quatre migrations appliquées depuis zéro, puis rejeu sans migration en attente ; 31 tests / 14 fichiers |
| Compose résolu | PASS : `pnpm infra:validate`, exemples publics uniquement |
| Build Next.js | PASS : génération du client et compilation Next.js 16.3.8 |
| E2E pertinents | PASS : quatre scénarios de `sprint.spec.ts`, Chrome local, serveur localhost:3410 et PostgreSQL jetable |
| Image Docker Node 24 et démarrage réel | PASS : build de la cible `production`, base PostgreSQL 18.4 Docker vide, quatre migrations créées au démarrage, table `rateLimit` constatée en SQL et vrai POST invité Better Auth à HTTP 200. Après redémarrage : quatre migrations terminées et même utilisateur conservé. Identifiants PostgreSQL invalides : sortie en échec et aucun démarrage Next.js |
| Migration/déploiement Dokploy, OAuth externe | NON EXÉCUTÉS : aucun accès à la base distante, aucune publication ou migration de production |

Le build et les tests DB/browser hôte utilisent les autorisations techniques nécessaires à Turbopack, PostgreSQL et Chrome, avec cache SWC sous `/private/tmp/typing-dokploy-swc-cache`. Le moteur Docker local nécessite aussi un accès autorisé à son socket. Les contrôles hôte restent sous Node 25.6.0 ; le build et la recette de l’image de production utilisent Node 24 dans le conteneur. Le guide et le README remplacent explicitement l’étape manuelle antérieure. Le service distant devra être reconstruit/redéployé avec cette image pour appliquer ce changement.

**Échecs intermédiaires de recette :** les deux tests de démarrage étaient rouges avant le correctif. Le premier harnais Docker attendait une ligne dans un seul flux de logs et conservait le port temporaire précédent après un redémarrage ; les logs montraient déjà un démarrage réussi et aucune migration en attente. La reprise relit le port réellement publié puis attend HTTP. Un autre essai a rencontré l’arrêt du serveur PostgreSQL provisoire d’initialisation : l’attente finale utilise la disponibilité TCP, distincte de ce serveur initial sur socket. Une reprise après nettoyage a aussi rencontré une image de test déjà supprimée, reconstruite depuis le cache. Une tentative de limitation du rôle bootstrap jetable a été refusée par PostgreSQL, sans modification du rôle ; le scénario d’échec final utilise des identifiants invalides. La recette finale complète passe. **Échecs finaux : aucun.** Les conteneurs, volumes anonymes, réseaux et tags d’image sont propres à cette recette, avec préfixe `typing-production-migration-smoke-`, puis supprimés ; aucune base ou infrastructure utilisateur n’est modifiée.

## Résolution DNS PostgreSQL dans Dokploy — 7 octobre 2026

Incident signalé dans Dokploy : `prisma.rateLimit.findMany()` échoue avec `getaddrinfo EAI_AGAIN production-postgres`. Le diagnostic établit un échec de résolution DNS, sans preuve distante de sa cause exacte. Le Compose versionné ne raccordait pas `app` au réseau de la base Dokploy. Correction d’infrastructure pour `DOC-S1-DEPLOY` et `DOC-FINAL-README` : déclaration explicite du réseau existant `dokploy-network`, externe. Les modules et contrats métier, la limitation Better Auth et les migrations restent identiques. Le guide demande de vérifier aussi l’hôte interne exact, la disponibilité de la base et le Compose rendu en cas d’isolation Dokploy.

Avant correction, le nouveau contrôle du vrai parseur Compose échoue avec « Production app must share the Dokploy database network ». Après correction, `infra:validate` passe pour les configurations locale et production avec uniquement les exemples publics. Trois tests unitaires vérifient notamment le refus d’une application isolée, d’un réseau privé nouvellement créé et d’un nom de réseau différent.

| Contrôle final | Résultat |
| --- | --- |
| Configurations Compose | PASS : parseur Docker Compose réel, réseau de production externe partagé ; aucun service démarré |
| Lint, types stricts, frontières | PASS |
| Unitaires | PASS : 94 tests / 27 fichiers |
| Intégrations | PASS : commande `pnpm test:integration`, PostgreSQL 18.4 jetable et replay des migrations |
| Build de production | PASS : Next.js 16.3.8 |
| E2E pertinents | PASS : commande `pnpm test:browser tests/e2e/sprint.spec.ts --trace off`, Chrome local et PostgreSQL jetable, serveur localhost:3410 |
| Production réelle, DNS Dokploy, OAuth externe | NON EXÉCUTÉS : aucun accès distant, déploiement ni migration de production dans ce lot |

Échecs intermédiaires d’environnement : mémoire partagée PostgreSQL refusée par le sandbox, cache natif SWC hors des chemins autorisés et compilation Turbopack confinée bloquée. Les tests DB, le build et Chrome passent avec l’autorisation technique locale ; cache SWC redirigé vers `/private/tmp/typing-dokploy-swc-cache`. Le build réécrit `next-env.d.ts` ; ses imports initiaux sont restaurés puis les types revérifiés. Hôte Node 25.6.0, hors de Node 24 prévu : aucune nouvelle preuve Node 24 ou de connectivité de production revendiquée. Le défaut réseau est corrigé dans le dépôt ; la restauration du service distant reste à confirmer après utilisation de cette configuration.

## Stories #9 et #10 — recette locale du 5 octobre 2026

Demande : compléter création/entrée « Sur code » (#9) et présence/reconnexion (#10), avec **validation en local** confirmée par l'utilisateur. Référence : `SALLE-01/02/05/06/09/10`, socle `TECH-06` et `SEC-01`. Checkout `main`, base `25fd45a6d2b019c95f14043e92f319336b217613`, avec les modifications antérieures et ce lot non commitées. Node 24.19.0, Next 16.3.8, Chrome installé sur macOS ; chaque contrôle DB utilise un PostgreSQL 18.4 jetable neuf sur 127.0.0.1:55432, migrations depuis zéro puis replay, suppression à la fin. Le build et les tests utilisent les variables locales de ce harnais.

### Changement et preuve du défaut

La création, l'entrée par code et la présence réelle étaient déjà implémentées. Le point local manquant de #9 était la preuve de la limitation des codes. Six tests d'intégration passant par la vraie session Better Auth, la composition HTTP et PostgreSQL ont été ajoutés dans `tests/integration/lobby-rate-limit.test.ts`. Avant correction : **5 PASS / 1 FAIL**, la tentative à exactement 60 000 ms obtenait 429 au lieu de 404 pour un code inconnu. Le compteur comparait strictement la date de début au seuil. `shared/infrastructure/http/rate-limit.ts` réinitialise désormais à la frontière inclusive ; aucune nouvelle règle de salle, migration ou traduction n'est nécessaire.

La valeur retenue reste 10 tentatives par IP/opération et fenêtre fixe de 60 secondes, sans prolongation sur refus. Tests : budget partagé entre compte/invité et codes, IP distinctes, séparation création/entrée, dix admissions sur vingt commandes concurrentes, JSON/codes invalides comptés, origine étrangère/session absente refusées avant compteur, frontière exacte, lookup/heartbeat/départ disponibles après épuisement. Deux vrais parcours navigateur FR/EN dans `tests/e2e/lobby-rate-limit.spec.ts` prouvent le HTTP 429 traduit, l'absence de siège et la persistance de la limite après reload.

### Contrôles finaux

| Contrôle | Résultat et portée |
| --- | --- |
| Lint, types, frontières | **PASS** : `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries` ; types repassés après restauration du fichier généré `next-env.d.ts` à son état présent avant le build |
| Unitaires | **58 PASS / 16 fichiers** |
| Intégration PostgreSQL | **26 PASS / 12 fichiers**, dont les six nouveaux ; deux migrations depuis zéro et replay sans migration en attente |
| Build de production | **PASS** : client Prisma généré, compilation et types, routes réelles et maquette préexistante |
| E2E du build local | **35 PASS / 35**, environ 1,6 minute ; deux nouveaux scénarios et 33 régressions existantes |
| Création/entrée réelles | Compte/invité, interdiction de création invitée, rôle spectateur hors capacité, conflit d'onglet, Quitter explicite, codes invalides/inconnus, salles pleines/fermées, rechargement sans doublon ; FR/EN PASS |
| Présence réelle #10 | `tests/e2e/presence.spec.ts` : deux sessions, vrai SSE/heartbeat, coupures réseau invité puis hôte, mêmes identités/salle/hôte et deux membres après reprise, sans reload ; PASS |
| HTTP/SSE | `scripts/smoke-http.ts` sur une autre DB neuve et le même build : compte/invité, CSRF, schémas, création/entrée, deuxième personne visible dans le stream, adhésion répétée, récupération et **révocation réelle d'une session terminant le stream** ; PASS |

Mesures localhost, en millisecondes depuis chaque coupure pour la reprise : arrivée **823** ; invité, perte détectée **10 413**, reprise **15 268** ; hôte, perte détectée **10 414**, reprise **14 261**. La reprise reste dans la grâce de 30 secondes ; aucune garantie de performance ou de pleine charge n'est déduite de ces mesures.

**Échecs intermédiaires :** le sandbox empêchait `initdb` de créer sa mémoire partagée ; le contrôle a été exécuté avec l'autorisation locale nécessaire. Le test de frontière était rouge avant le correctif décrit ci-dessus. **Échecs finaux : aucun.**

**Non exécutés :** VPS public HTTPS/proxy réel, callbacks OAuth externes, mesure de charge et Lighthouse. La recette locale de #9 et #10 est terminée ; leurs critères de production restent ouverts jusqu'à la livraison de #11. Le parcours de maquette `/play` préexistant conserve son statut de démonstration. Aucune base utilisateur n'a été migrée ou réinitialisée.

## Parcours code et joueur sur pages dédiées — 5 octobre 2026

La dernière demande remplace le nom de salle par un code et sépare le pseudo/personnage du salon. [Contrat et captures](play-preview.md#correction-demandée--trois-pages-et-code-de-salle). `app` expose `/[locale]/play`, `/play/player` et `/play/room` ; `composition/play` assemble le shell, et le provider/vues de `lobby/presentation` conservent uniquement un état en mémoire. Code canonique de six caractères, pseudo de 3–20 caractères, quatre personnages ; le salon affiche code, liste, réglages de démonstration et Modifier/Quitter. Modifier ouvre la page préremplie, Annuler préserve le joueur confirmé, Enregistrer le remplace sans doublon, Quitter réinitialise. Aucune API, session, DB, SSE ou course nouvelle ; les statuts métier restent inchangés.

Node 24.19.0, Next 16.3.8, Chrome installé sur macOS, état local non commité et changements antérieurs conservés. Contrôles finaux terminés vers 15 h 01 UTC.

| Contrôle sur l’état final | Résultat et portée |
| --- | --- |
| Lint et frontières | PASS : `pnpm lint`, `pnpm check:boundaries` |
| Types stricts | PASS : `pnpm typecheck`, après rafraîchissement des définitions de routes dev générées ; imports initiaux de `next-env.d.ts` préservés |
| Formatage et diff | PASS : Prettier des sources/tests de ce lot et `git diff --check` |
| Unitaires | PASS : **58 tests / 16 fichiers** |
| Intégration | PASS : **20 tests / 11 fichiers**, PostgreSQL 18.4 jetable ; migrations depuis zéro et replay PASS |
| Build production final | PASS : génération Prisma, compilation, types et les trois routes attendues |
| E2E production final | PASS : **33/33**, environ 1,2 minute, serveur 3108 et PostgreSQL jetable ; huit scénarios du prototype et 25 existants |
| Parcours du prototype | FR/EN : code/pseudo invalides, trim et majuscules, trois URLs, quatre radios et clavier, confirmation, brouillons, Modifier/Annuler/Enregistrer, historique, reset, gardes d’URL directe/reload et focus ; aucun appel API ou cookie Better Auth |
| Accessibilité et dimensions | **36 contrôles axe WCAG A/AA** : FR/EN × clair/sombre × 360/820/1440 px × trois pages, sans débordement ; mouvement réduit |
| Régression réelle | Compte/invité, commandes de salle, rôle/capacité, présence/reconnexion, conflits, langues/thèmes, formulaires et Select personnalisé PASS |
| Revue et inspection | Revue indépendante sans autre défaut actionnable. Code, setup et édition préremplie inspectés ; salon sombre à 1440 et 360 px. [Captures actuelles](play-preview.md#inspection-du-parcours-à-trois-pages) |

**Rouge avant réalisation :** le test attendait `/fr/play/player` après la saisie du code, alors que l’ancienne vue restait sur `/fr/play`. **Échec intermédiaire de types :** les fichiers générés `.next/dev/types/routes.d.ts` décrivaient seulement le layout de locale, tandis que le build décrivait aussi `/[locale]/play` ; le contrôle séparé signalait TS2344 dans le validateur généré. Ce cache uniquement a été régénéré avec les fonctions de la version Next installée, puis `pnpm typecheck` passe. Le helper temporaire est supprimé ; aucune suppression de type ni modification de `tsconfig.json`, AGENTS, `next-env.d.ts`, BUILD_ID ou des types de production. **Échecs finaux : aucun.**

**Non exécutés :** lecteur d’écran et appareil tactile réels, Firefox/WebKit, OAuth GitHub/Discord externe, déploiement, charge et Lighthouse. Aucun succès réel de salle ou course n’est revendiqué. Les DB de contrôle sont arrêtées/supprimées après chaque run ; une prévisualisation de production reste disponible sur une autre DB jetable : [anglais](http://localhost:3108/en/play), [français](http://localhost:3108/fr/play).

## Salon de démonstration — 5 octobre 2026 (historique avant pages dédiées)

Nouvelle demande autorisant des mocks : un champ de nom de salle, puis pseudo, personnage, liste de joueurs et petit résumé des réglages. [Contrat et réalisation](play-preview.md), [architecture](ARCHITECTURE.md#prototype-isolé-de-salon--5-octobre-2026), [portée dans la matrice](EXIGENCES.md#prototype-de-présentation-isolé--5-octobre-2026). Routes `/fr/play` et `/en/play`, assemblage dans `composition/play`, état local et composants dans `lobby/presentation`. Aucune commande auth/lobby, session, persistance ou course ajoutée ; badge et fixtures explicites. Les parcours réels restent accessibles avec les mêmes URLs dans `(site)`.

État local non commité, Node 24.19.0, Next 16.3.8 et Chrome installé sur macOS. Contrôles finaux terminés vers 14 h 03 UTC ; les changements déjà présents dans le checkout sont conservés.

| Contrôle sur l’état final | Résultat et portée |
| --- | --- |
| Lint, types stricts, frontières | PASS : `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries` |
| Formatage et diff | PASS : Prettier des sources/tests de ce lot et `git diff --check` |
| Unitaires | PASS : **58 tests / 16 fichiers** |
| Intégration | PASS : **20 tests / 11 fichiers**, PostgreSQL 18.4 jetable sur 55433 ; migrations depuis zéro et replay PASS |
| Build production final | PASS : génération Prisma, compilation, types et nouvelle route `/[locale]/play` |
| E2E production final | PASS : **31/31**, environ 1,1 minute, serveur 3108 et PostgreSQL jetable ; six nouveaux scénarios et 25 existants |
| Comportement du prototype | FR/EN : entrée, pseudo invalidé et bouton désactivé, quatre radios et flèches clavier, ajout d’un joueur, brouillon distinct, sauvegarde sans doublon, sortie avec reset et focus des titres ; aucun appel API ou cookie Better Auth |
| Accessibilité et dimensions | FR/EN × clair/sombre × 360/820/1440 px : absence de débordement et axe WCAG A/AA sur entrée, salon avant et après confirmation ; préférence de mouvement réduit |
| Régression réelle | Parcours existants : compte/invité, commandes de salle, rôle/capacité, présence/reconnexion, conflits, langues/thèmes, formulaires et Select personnalisé PASS après le déplacement dans `(site)` |
| Revue et inspection | Revue indépendante ; focus au retour et contraste du badge local corrigés. Entrée et salon bureau clair, salon sombre à 360 px inspectés dans le navigateur. [Captures historiques](play-preview.md#inspection-initiale-dans-le-navigateur-historique) |

**Rouge avant réalisation :** `/fr/play` renvoyait 404. **Échecs intermédiaires :** le premier build compilait l’application mais rencontrait les anciens imports du cache `.next/dev/types/validator.ts` vers les routes déplacées. Seul ce cache généré a été régénéré ; le build final passe. Le premier run navigateur terminait à 29/31 : les deux nouveaux parcours essayaient de cliquer directement les radios visuellement masquées, recouvertes par le SVG. Les clics ciblent désormais les libellés visibles et conservent les assertions sur la vraie radio ; suite complète finale 31/31, sans modification produit pour satisfaire ces sélecteurs. **Échecs finaux : aucun.**

Les DB de contrôle sont temporaires, distinctes de toute base utilisateur, arrêtées et supprimées après chaque run. Le cache dev régénéré inclut `(site)` et `/play` ; les imports de développement initiaux de `next-env.d.ts` ont été restaurés, puis types repassés. Les ajouts automatiques de Next dans AGENTS ont été retirés sans modifier les instructions originales ; `tsconfig.json` reste intact. Une nouvelle prévisualisation de production sur DB jetable est ouverte sur [localhost:3108/fr/play](http://localhost:3108/fr/play), avec [version anglaise](http://localhost:3108/en/play).

**Non exécutés :** lecteur d’écran et appareil tactile réels, Firefox/WebKit, OAuth externe, déploiement, charge et Lighthouse. Les joueurs/réglages de cette page sont des exemples ; aucun moteur de course, présence multijoueur, réglage serveur, bonus ou bot n’est livré par cette maquette. Aucun statut officiel AUTH/SALLE/CONF/COURSE n’est relevé.

## Composants et sélecteur personnalisé — 4 octobre 2026

Demande suivante : extraire les blocs de présentation et remplacer le menu natif du rôle. Contrat et propriété : [direction UI](ui-playful.md) et [architecture](ARCHITECTURE.md). Primitives partagées pour Select, langue et thème ; cartes anonymes dans composition ; champs/providers dans identity ; formulaires, rôle et salle active dans lobby. Les commandes, validations serveur, règles de salle et Better Auth restent identiques. Node 24.19.0, Next 16.3.8, Chrome installé, état local non commité.

| Contrôle sur l’état final | Résultat et portée |
| --- | --- |
| Lint, types stricts, frontières | PASS : `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries` |
| Formatage et diff | PASS : Prettier des sources/tests de ce lot et `git diff --check` |
| Unitaires | PASS : **58 tests / 16 fichiers** |
| Intégration | PASS : **20 tests / 11 fichiers**, PostgreSQL 18.4 jetable ; dernière exécution après le correctif CSS sur le port 55433, migrations initiales et replay PASS |
| Build production final | PASS après correction du layout ; génération Prisma, compilation et vérification TypeScript |
| E2E production final | PASS : **25/25**, environ 1,3 minute, port 3107 et PostgreSQL jetable ; serveur de développement 3000 laissé intact |
| Sélecteur personnalisé | Six scénarios : menu DOM et options accessibles, IDs indépendants, focus, clic, Home/End, recherche par caractères, Tab confirme et avance, Échap annule, clic extérieur ferme ; création réelle en spectateur constatée dans `/api/lobbies/me` |
| Thèmes, langues, dimensions | Axe WCAG A/AA menu ouvert FR/EN × clair/sombre à 360 px ; valeurs, chevrons et menus dans leurs limites en FR/EN à 768/820/900 px ; suites existantes auth, langues/thèmes persistants, invités, conflits et temps réel PASS |
| Revue et inspection | Revue indépendante sans autre défaut confirmé. Menus français inspectés dans la prévisualisation sur surface jaune et sombre : [création](images/custom-role-menu.jpg), [rejoindre](images/custom-role-menu-dark.jpg) |

**Rouge avant Select :** le test attendait `aria-expanded` et une vraie liste DOM ; le `<select>` natif n’avait pas cet attribut. **Rouge de layout :** après les 24 premiers E2E verts, le test tablette complémentaire a détecté un chevron dépassant de 10,23 px à 820 px et de 22,20 px à 768 px. Les champs capacité/rôle passent désormais sur deux colonnes seulement à partir de 400 px intérieurs dans la carte. Rebuild et suite complète finale : 25/25. **Échecs finaux : aucun.**

**Non exécutés :** lecteur d’écran et appareil tactile réels, OAuth GitHub/Discord réel, déploiement, charge et Lighthouse. Axe, focus accessible constaté et tests Chrome ne certifient pas ces contrôles. Aucun schéma, migration ni traduction nouvelle nécessaire ; tous les libellés du menu viennent des catalogues existants. Le fichier de types Next généré par le build a été remis à son état de développement présent avant ce lot, puis typecheck repassé. Les stacks de test sont arrêtées/supprimées ; une prévisualisation locale sur une autre DB jetable reste ouverte pour consultation.

## Terrain de jeu des claviers — 4 octobre 2026

Nouvelle demande utilisateur : recherche de références ludiques, thème distinct, composants et illustrations originales. [Direction et sources](ui-playful.md), [moodboard et palette](DEMARCHE-CREATIVE.md), [PNG et prompts finaux](../public/illustrations/README.md). Aucun changement de règle métier, schéma, migration, secret ou protocole ; logo utilisateur conservé. État local non commité, Node 24.19.0, Next 16.3.8, Chrome installé sur macOS.

| Contrôle final | Résultat et portée |
| --- | --- |
| `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries` | PASS ; types stricts et frontières conservées |
| Formatage et `git diff --check` | PASS sur les sources et tests modifiés |
| `pnpm test:unit` | PASS : **58 tests / 16 fichiers** |
| `pnpm test:integration` | PASS : **20 tests / 11 fichiers**, PostgreSQL 18.4 jetable ; les trois tests seed passent ici |
| Migrations | PASS : deux migrations depuis une DB vide, puis replay sans migration en attente |
| `node --import tsx scripts/test-stack.ts run build` | PASS : génération Prisma, compilation de production, types et routes attendues |
| Playwright sur le build final | PASS : **19/19**, 57,1 s, PostgreSQL jetable neuf et Chrome système |
| Accessibilité et responsive | PASS : axe WCAG A/AA accueil, connexion, inscription, formulaires compte et salle en FR/EN × clair/sombre à 360 px ; clavier, focus, préférences et absence de débordement couverts par la suite existante |
| Nouvelle régression `playful-ui.spec.ts` | PASS : quatre combinaisons FR/EN × 360/1440 px, PNG du clavier chargé, alt vide et absence dans la recherche accessible, mouvement réduit, navigation connexion et vraie session invitée |
| Revue | Deux points corrigés : description de création neutre pour comptes déjà connectés ; token distinct pour bordures de champs (3,48:1 clair, 4,78:1 sombre, 3,56:1 surface jaune) |
| Inspection visuelle | Accueil français clair bureau, sombre mobile 360 px et formulaires mobiles ; connexion anglaise bureau avec seconde illustration. PNG transparents et police locale effectivement chargés. [Capture finale de production](images/playful-ui-desktop.jpg) |

**Rouge avant implémentation :** le scénario français à 360 px échouait sur l’illustration absente. **Essais intermédiaires échoués :** premier run final 14/19, car un ancien test cherchait le titre anglais précédent et les quatre nouveaux tests confondaient rôle intrinsèque d’image et présence dans l’arbre accessible. Le titre est maintenant lu depuis le catalogue ; la recherche par rôle ignore correctement l’image masquée. Le code produit n’a pas été modifié pour satisfaire ces assertions ; la suite complète repassée termine à 19/19. **Échecs finaux : aucun.**

Les stacks de test sont temporaires, indépendantes de la base du projet, arrêtées et supprimées après exécution. Le sandbox empêchait initialement `initdb` de créer sa mémoire partagée ; l’exécution locale autorisée a permis les contrôles sans utiliser de base inconnue. Pour reproduire, placer Node 24 dans le PATH, définir `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` vers Chrome installé, puis exécuter `node --import tsx scripts/test-stack.ts exec playwright test --reporter=line` après le build.

**Non exécuté dans ce lot :** OAuth GitHub/Discord réel, déploiement public/VPS, charge et Lighthouse, validation personnelle du nom/logo/croquis et favicon. Les pages de course, bonus et bots restent futures. Une prévisualisation locale sur une DB jetable peut être conservée pour consultation ; elle n’est pas un déploiement.

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

## Entrée `/play` réservée au code et adhésion réelle — 6 octobre 2026

Demande utilisateur : `/play` sert uniquement à rejoindre, comme le champ de code de la maquette ; retirer les mentions de démonstration. Le formulaire de création reste à l’accueil. Le code conserve les six caractères alphanumériques de `SALLE-02`, avec normalisation et exclusion de `0 O 1 I L`.

Le parcours réel est `/play` → `/play/player?code=…` → `/play/room`. La première page ne crée ni session ni adhésion. La composition valide le paramètre côté serveur et résout l’acteur ; le formulaire invité appelle Better Auth puis la commande lobby avec la session cookie réelle. La route salle est ouverte seulement après une adhésion réussie. Un échec reste traduit sur la page du joueur ; un conflit propose un retour à la salle existante sans départ automatique. La room utilise la roster PostgreSQL, SSE et heartbeat existants, et le départ explicite retourne à `/play`. Aucune fixture de joueur ni réglage de course simulé n’est monté.

| Contrôle | Résultat courant |
| --- | --- |
| Test de régression avant modification | Les deux cas FR/EN échouaient sur deux formulaires au lieu du champ de code seul ; même pour un compte |
| Lint, typecheck, frontières | PASS |
| Unitaires | PASS : 60 tests / 17 fichiers, dont les deux nouvelles régressions `/play` |
| Intégrations | PASS : 26 tests / 12 fichiers, PostgreSQL 18.4 jetable, migrations depuis zéro puis rejouées |
| Build standard `pnpm build` (Turbopack) | ÉCHEC d’environnement : traitement CSS incapable de créer son port temporaire ; aucune correction de Turbopack revendiquée |
| Build `pnpm exec next build --webpack` | PASS : production et routes code/joueur/salle compilées |
| Recette ciblée `play-join.spec.ts` | PASS : 6 E2E FR/EN, Chrome installé et DB jetable |
| Suite navigateur complète | PASS : 33/33 E2E, dont 6 nouveaux scénarios FR/EN du parcours `/play` |

La recette ciblée vérifie le champ unique sans création ni mention de démonstration, codes invalides, accès directs gardés, absence de mutation avant le pseudo, création de session avant l’adhésion, roster commune à deux sessions, rechargement sans doublon, départ réel et erreur de salle inconnue sans faux salon. La page de code passe aussi axe AA dans les deux langues. `tests/e2e/play-preview.spec.ts` est remplacé par les scénarios réels de `play-join.spec.ts`.

Conditions locales : Node 25.6.0 (le projet demande Node 24), cache SWC temporaire via `SWC_NATIVE_BINDING_CACHE=/private/tmp/clak-swc-native-cache`, Chrome installé via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, et serveur de test isolé à `PLAYWRIGHT_BASE_URL=http://localhost:3400`. Le port 3000 était déjà utilisé ; `playwright.config.ts` honore désormais l’origine locale configurée sans réutiliser ni interrompre ce serveur. Le navigateur embarqué de Playwright était absent ; aucun téléchargement n’a été nécessaire. Le démarrage de PostgreSQL dans le sandbox a d’abord échoué sur la mémoire partagée ; la recette a ensuite été exécutée avec l’autorisation d’exécution nécessaire, toujours sur une base créée puis supprimée par `test-stack.ts`.

Ces preuves locales ne certifient ni OAuth réel ni déploiement. Les fonctionnalités de course, bonus, bots, configuration et personnalisation persistante ne sont pas livrées par ce changement ; les statuts officiels de la matrice ne sont pas relevés artificiellement.

## Rangement de la présentation lobby — 6 octobre 2026

Demande utilisateur : nettoyer les fichiers de présentation du lobby et les ranger par responsabilité. Cette modification conserve le parcours code → identité/pseudo → salle et la création à l’accueil. Elle relève de `TECH-01/02` ; les statuts métier de la matrice restent inchangés.

- `presentation/entry` possède le champ de code, les cartes rejoindre/créer et le champ de rôle.
- `presentation/room` possède la carte active, la roster, le panel, le reducer et le hook `useLobbyRoom`.
- `presentation/transport` possède les commandes HTTP navigateur et le heartbeat.
- Le wrapper du champ de code est fusionné dans `RoomCodeEntry`; les sept composants/contextes de démonstration non référencés sont supprimés. Aucun ancien export de maquette ne reste dans le code actif.
- Le shell et le billet joueur conservent leurs styles sous `composition/play`; les styles du champ sont colocalisés dans le module. Les règles CSS actives sont conservées, les règles inutilisées retirées, et le catalogue FR/EN est réduit aux clés actives sous `play`.

`LobbyPanel` assemble désormais les vues en 76 lignes ; `useLobbyRoom` porte lecture initiale, verrou de commande, récupération après conflit, snapshots ordonnés, heartbeat et nettoyage des connexions. Les superviseurs, repositories, API et migrations ne changent pas. Les consommateurs et les imports de tests suivent les nouveaux chemins publics.

| Contrôle | Résultat final |
| --- | --- |
| Régressions ciblées avant rangement | PASS : 21 tests dans 6 fichiers |
| Lint, typecheck, frontières, diff sans erreurs d’espacement | PASS |
| Unitaires | PASS : 60 tests / 17 fichiers |
| Intégrations | PASS : 26 tests / 12 fichiers, migrations appliquées puis rejouées sur PostgreSQL jetable |
| Build Next avec Webpack | PASS, toutes les routes existantes compilées |
| Suite navigateur de production | PASS : 33/33 E2E, FR/EN, création/adhésion, conflits, requête initiale retardée, reload, départ, reconnexion et présence partagée |
| Styles du champ de code déplacés | PASS : axe et absence de débordement à 360 et 1440 px, FR/EN dans `play-join.spec.ts` |
| Build Turbopack par défaut | NON RÉEXÉCUTÉ : limitation de l’environnement déjà documentée dans la recette précédente ; le rangement est compilé et testé avec Webpack |

Les deux échecs initiaux du refactor sont corrigés : type de connexion élargi par le retour du hook, puis test de rendu appelant directement un composant contenant désormais ses hooks. L’union de connexion est explicite ; le test monte `<PlayPage />` dans son provider. Les fichiers `next-env.d.ts` générés par le build sont remis à leurs imports initiaux, puis typecheck passe à nouveau.

La recette utilise les mêmes conditions locales que le parcours précédent : Chrome installé avec profil de test isolé, serveur à `localhost:3400`, cache SWC temporaire et DB PostgreSQL créée puis supprimée par `test-stack.ts`. Le serveur de développement sur 3000 n’est pas utilisé pour les tests. Node 25.6.0 reste hors de la version 24 demandée par le projet. Aucun déploiement ni callback OAuth réel n’est vérifié par ce rangement.

## Lobby autonome, personnages partagés et accueil de présentation — 6 octobre 2026

Décisions utilisateur : conserver la scène de clubhouse approuvée, afficher le lobby sur sa propre page, partager les personnages réellement choisis et afficher son identifiant ; puis retirer tous les formulaires de salle de l’accueil. L’accueil propose maintenant deux liens, `/play` (code seul) et `/play/create` (création pour les comptes). La salle et son roster graphique restent à `/play/room`. Le choix de personnage est persisté dans l’adhésion, validé serveur et publié via SSE. Le nom/logo fourni est conservé.

**Contrôle initial :** les deux nouveaux tests de l’accueil ont échoué sur la présence des formulaires avant leur retrait, puis passent après implementation. Les anciennes attentes de formulaires d’accueil ont été mises à jour pour les parcours demandés ; le cas de panne d’identité protège maintenant la page de création.

| Contrôle final sur l’arbre local | Résultat |
| --- | --- |
| Lint, TypeScript et frontières | PASS |
| Unitaires | PASS : 68 tests / 20 fichiers |
| Intégrations PostgreSQL jetable | PASS : 27 tests / 13 fichiers, trois migrations depuis zéro puis replay |
| Build Next.js Webpack | PASS : nouvelle route `/[locale]/play/create` et toutes les routes compilées |
| Navigateur Chromium de production | PASS : 35/35 scénarios, pages dédiées FR/EN, compte/invité, création, adhésion, refus, conflits, personnages partagés/modifiés, rechargement, départ et reconnexion |
| Mobile/accessibilité | PASS : absence de débordement à 360 px, thèmes clair/sombre, radios clavier, menus et axe AA automatisé |
| Diff sans erreurs d’espacement | PASS |
| Turbopack et OAuth réel | NON EXÉCUTÉS dans ce lot ; aucune nouvelle preuve de déploiement |

Le contrôle visuel précédent a trouvé les utilitaires Tailwind absents et des icônes surdimensionnées : le chargeur de configuration de la version Next installée ignore `postcss.config.ts`. `.postcssrc.json` remplace ce fichier ; après purge du seul cache Webpack généré, le build produit réellement les classes `.h-5`/`.w-5`. Les tests contrôlent maintenant aussi les dimensions des icônes. Les contrastes des personnages sélectionnés et du changement de thème ont été corrigés ; les trois derniers échecs après activation réelle de Tailwind portaient sur un débordement de navigation FR à 360 px, corrigé par l’espacement mobile. La suite finale ci-dessus passe avec Tailwind actif.

Captures locales ignorées par Git : `test-results/lobby-en-desktop.png` et `test-results/lobby-en-mobile.png`. Les E2E de sessions n’enregistrent pas les cookies dans leurs traces. Serveur de recette isolé à `localhost:3400`, profil Chrome de test, DB `typing_test` créée puis supprimée par `test-stack.ts`. Le serveur local à 3000 est conservé. La migration additive `20261006142000_lobby_character` a également été appliquée à la base de développement documentée `typing_dev`, après vérification de son hôte local, nom, utilisateur et migrations ; aucun reset et aucune base inconnue ou de production ne sont utilisés.

Limite d’environnement conservée : Node 25.6.0 au lieu de la version 24 demandée ; les résultats ci-dessus sont ceux de cette exécution locale. Les fonctionnalités de course, bonus et bots ne sont pas ajoutées, et les statuts officiels ne sont pas relevés artificiellement.

## Construction Docker Apple Silicon — 7 octobre 2026

Signalement utilisateur : le service applicatif échoue à `Dockerfile:7`, `pnpm install --frozen-lockfile`. Reproduction avec `docker build --target dependencies --progress=plain` : l’installation télécharge correctement les paquets, puis refuse `@embedded-postgres/linux-arm64@18.4.0-beta.17` avec `ERR_PNPM_IGNORED_BUILDS`. Docker Desktop utilise Linux ARM64 sur ce poste ; cette variante manquait à la liste explicite `allowBuilds` alors que Linux x64 et macOS y figuraient.

Correction : ajout de `@embedded-postgres/linux-arm64: true` à `pnpm-workspace.yaml`. Le paquet et le lockfile restent inchangés. Le postinstall observé exécute `scripts/hydrate-symlinks.js` et se termine correctement. Pas d’autorisation globale de scripts.

| Contrôle | Résultat |
| --- | --- |
| Régression de politique avant correction | ÉCHEC attendu : entrée ARM64 absente |
| Régression après correction et suite unitaire | PASS : 69 tests / 21 fichiers |
| Lint, TypeScript, frontières et diff | PASS |
| `pnpm infra:validate` | PASS : parseur Compose, ports loopback, healthchecks et volumes |
| `docker build --target development --progress=plain --tag typing-local-app .` | PASS : install frozen, postinstall ARM64, copie du code et export complet de l’image Linux ARM64 |
| Production Next, intégrations DB et E2E applicatifs | NON RÉEXÉCUTÉS : seul le droit d’exécution du postinstall d’un paquet optionnel change |
| Démarrage complet des services et migrations | NON EXÉCUTÉS dans ce correctif ; aucune donnée ni volume local modifié |

Les premières commandes pnpm sur l’hôte ont déclenché une vérification de fraîcheur puis un accès registre bloqué par le sandbox, et refusé une réinstallation sans terminal interactif. La validation Compose avec les droits réseau nécessaires a resynchronisé les métadonnées de dépendances ; les vérifications finales ont appelé les outils locaux directement et passent. Le cache `.pnpm-store` vide créé par cette tentative a été supprimé ; le store existant de l’utilisateur est conservé. Node hôte reste 25.6.0 ; la construction Docker utilise Node 24 comme prévu.

## Accueil minimal — 7 octobre 2026

Décision utilisateur : simplifier l’accueil, retirer la création et proposer un CTA pour rejoindre. `composition/home/home-page.tsx` affiche maintenant un titre, une courte description, un seul lien vers `/play` et la note sans compte. Les cartes, l’illustration et les étapes sont retirées, avec leurs composants, styles exclusifs et traductions inutilisées. Les textes FR/EN, le shell, le logo fourni et les thèmes sont conservés. La création reste sur sa page dédiée et les règles serveur ne changent pas.

**Régression avant correction :** les deux tests unitaires FR/EN échouent sur le lien `/play/create` encore présent. Après correction, ils vérifient un seul lien, un seul titre, le CTA traduit et l’absence de création, formulaire, illustration et étapes. Les anciennes attentes de navigation depuis la carte de création passent maintenant directement par `/play/create`.

| Contrôle final sur l’arbre local | Résultat |
| --- | --- |
| Lint, TypeScript strict et frontières | PASS |
| Unitaires | PASS : 69 tests / 21 fichiers |
| Intégrations PostgreSQL jetable | PASS : 27 tests / 13 fichiers ; trois migrations depuis zéro et replay |
| Build Next.js Webpack | PASS |
| E2E Chromium de production | PASS : 35/35 scénarios, dont CTA FR/EN activé au clavier, absence de création à l’accueil, comptes/invités, création dédiée et adhésion réelle |
| Mobile, thèmes et accessibilité automatisée | PASS : FR/EN clair/sombre, absence de débordement à 360/1440 px, mouvement réduit et axe AA des pages existantes |
| Inspection visuelle | PASS : accueil EN desktop clair et FR à 360 px sombre inspectés dans le navigateur |
| Diff sans erreur d’espacement | PASS |
| Échecs non résolus | Aucun |
| Turbopack, OAuth réel et déploiement | NON EXÉCUTÉS dans ce lot |

Les premières tentatives PostgreSQL sous sandbox ont été bloquées par `shmget: Operation not permitted`, puis la recette complète a passé avec les droits locaux nécessaires. La base `typing_test` a été créée dans un répertoire temporaire puis supprimée ; le serveur de recette et les profils de navigateur étaient isolés à `localhost:3400`. Aucun reset d’une base inconnue ou de production. Les imports initiaux de `next-env.d.ts` ont été conservés, puis le contrôle de types a passé de nouveau. Node hôte reste 25.6.0, hors de la version 24 demandée. Les statuts officiels ne sont pas relevés par ce changement de présentation.

## Profil personnel — 7 octobre 2026

Demande utilisateur : créer la page de profil selon les exigences et l’UI existante. Rattachement : `AUTH-04/05`, `SEC-02`, `DES-04/05/06`, `I18N-01/03`, `A11Y-01/02/03/04`. La page `/[locale]/profile` et son lien pour les comptes réutilisent le shell, les cartes, boutons, champs, icônes et tokens. `identity` possède validation, droits, repository et photo ; `composition/profile` assemble la page et le transport. Les cinq statistiques, le graphique de progression et l’historique affichent leur indisponibilité : `AUTH-06` et `HIST-01/02` restent non réalisés faute de course/résultats.

**Test initial rouge :** `tests/unit/profile.test.ts` échoue avant réalisation sur l’absence du contrat et du superviseur de profil. Après réalisation, les bornes 3/20, trim, contrôles, champs supplémentaires, droits compte/invité, session absente et propagation des erreurs sont testés. Les tests d’image utilisent le véritable décodeur : contenu PNG valide même avec nom/MIME incorrects, GIF/corruption/vide/taille excessive refusés, image compressée de plus de 16 millions de pixels refusée.

| Contrôle final sur l’arbre local non commité | Résultat |
| --- | --- |
| Installation verrouillée de Sharp 0.35.5 | PASS : version déjà transitive rendue directe ; aucune résolution tierce mise à jour |
| Lint, TypeScript strict, frontières | PASS |
| Prisma generate et validate | PASS |
| Unitaires | PASS : 79 tests / 24 fichiers sur l’hôte et dans le conteneur Node 24 |
| Intégrations PostgreSQL jetable | PASS : 31 tests / 14 fichiers ; quatre migrations depuis zéro puis replay |
| Build Next.js 16.3.8 Turbopack | PASS : page profil et deux routes API compilées |
| E2E Chrome isolé de production | PASS : 38/38 scénarios, dont trois nouveaux scénarios de profil |
| Profil réel | PASS : enregistrement au clavier du pseudo et de la photo, affichage 256 px, reload, déconnexion puis reconnexion avec identifiant inchangé |
| Refus serveur | PASS : absence/invité/session expirée ou révoquée, origine étrangère, identité falsifiée, champs/fichiers dupliqués, noms invalides, SVG/faux PNG/JPEG, >2 Mio, corps sans Content-Length surdimensionné, budget 10 commandes/IP puis HTTP 429 ; aucune écriture partielle |
| Photo privée et redimensionnée | PASS : JPEG/PNG/WebP réels convertis en WebP 256×256 sans EXIF ; remplacement, conservation lors d’une édition du nom seul ; autre compte, identifiant fourni en query et visiteur refusés |
| Traductions, thèmes, responsive et axe AA | PASS : profil FR/EN × clair/sombre × 360/820/1440 px, aucun débordement horizontal, dates localisées et aucune pageerror |
| Inspection visuelle | PASS : captures du profil EN desktop sombre et mobile clair inspectées |
| Diff sans erreur d’espacement | PASS |
| Échecs applicatifs non résolus | Aucun |
| OAuth réel, statistiques de course, VPS et déploiement | NON EXÉCUTÉS ; aucune preuve nouvelle revendiquée |

Les intégrations utilisent exclusivement `typing_test` sur PostgreSQL 18.4 temporaire, créé puis supprimé par `scripts/test-stack.ts`. La recette navigateur utilise `localhost:3400`, un contexte Chrome séparé et les comptes locaux. Les nouveaux tests de profil désactivent les traces de sessions ; captures ignorées par Git : `test-results/profile-desktop-dark.png` et `test-results/profile-mobile-light.png`. Les contrôles hôte utilisent Node 25.6.0, hors de la version 24 prévue ; cette limite demeure explicite.

Les premiers essais ont rencontré les restrictions de mémoire partagée PostgreSQL et de cache natif SWC du sandbox ; les exécutions locales autorisées ont ensuite passé. Le cache Playwright ne contient pas le navigateur attendu : la recette finale utilise le Chrome installé via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Deux attentes de test ont été corrigées : attendre la fin réelle de la déconnexion avant le login, et cibler l’alerte du formulaire dans `main` pour ne pas confondre l’annonceur de navigation Next.js. Ces essais intermédiaires ne sont pas comptés comme succès final.

La migration additive `20261007130000_profile_photo` a aussi été appliquée à la base de développement documentée `typing_dev`, après vérification de l’hôte `127.0.0.1:5432`, du nom, de l’utilisateur `typing` et des trois migrations existantes. Aucun reset ni test n’utilise cette base. Le conteneur applicatif a reçu la dépendance directe Sharp et a été relancé ; les volumes PostgreSQL/Redis/S3 sont conservés. La synchronisation pnpm a nécessité de remettre le cache à son emplacement attendu `/app/.pnpm-store` depuis les paquets déjà présents, puis de corriger uniquement son chemin absolu dans les métadonnées générées `node_modules/.modules.yaml`. Le contrôle automatique pnpm a ensuite passé et Next.js est prêt. La copie intermédiaire imbriquée du cache a été supprimée ; les 79 tests Node 24 finaux ne comptent pas deux fois les tests découverts dans cette copie. Le cache généré est désormais ignoré par Git. Contrôle HTTP local final : `/en/profile` retourne 200, `/api/profile/photo` sans session retourne 401 ; le conteneur reste en marche. Les imports initiaux de `next-env.d.ts` sont conservés et le contrôle de types final passe. Aucun secret n’a été affiché ou modifié.

## Navigation commune — 7 octobre 2026

Demande utilisateur : ajouter Rejoindre, Voir les salons et Créer une course ; proposer connexion + inscription aux visiteurs ; retirer l’apparence de dropdown du bouton de langue. `SiteNavigation` est maintenant partagé par les layouts site/play. La composition possède les contrôles de compte issus de la session réelle, sans import identity dans shared. Profil/déconnexion restent disponibles aux comptes ; les invités gardent leur déconnexion ; une panne d’identité ne devient pas un faux état déconnecté. FR/EN, préférences, query/fragment et logo fourni sont conservés.

**Limite explicite :** l’explorateur public `JOIN-02` et la visibilité publique ne sont pas implémentés. `/lobbies` affiche « Bientôt disponible » et les parcours réels par code/création, sans liste fictive ni exposition des salles « sur code ». Le libellé demandé « Créer une course » ouvre `/play/create`, dont la création de salle reste autorisée côté serveur ; aucun moteur de course n’est ajouté.

**Régression avant correction :** les tests du shell échouent en FR/EN sur l’absence de destination `/lobbies`. Les tests des layouts échouent sur l’absence d’inscription dans les deux headers et de profil dans le header play. Après correction, les branches visiteur, compte, invité et panne sont vérifiées. La destination de disponibilité future est vérifiée en FR/EN.

| Contrôle final sur l’arbre local | Résultat |
| --- | --- |
| Lint, TypeScript strict et frontières | PASS |
| Unitaires | PASS : 89 tests / 26 fichiers |
| Intégrations PostgreSQL jetable | PASS : 31 tests / 14 fichiers ; quatre migrations depuis zéro et replay |
| Build Next.js 16.3.8 Turbopack | PASS : nouvelle route `/[locale]/lobbies` compilée |
| E2E Chrome isolé de production | PASS : 41/41 scénarios, dont trois nouveaux scénarios de navigation |
| Nouvelle navigation | PASS : liens FR/EN sur accueil, rejoindre, création et salons à 360/820/1440 px ; état actif, destinations, connexion/inscription, profil/déconnexion et retour aux actions visiteurs après déconnexion |
| Langue, responsive et accessibilité | PASS : bouton avec une seule icône et sans menu, URL/préférence conservées par la régression existante, absence de débordement, axe AA FR/EN clair/sombre à 360 px |
| Inspection visuelle | PASS : navigation EN/FR mobile sombre et profil EN desktop sombre inspectés |
| Diff sans erreur d’espacement | PASS |
| Échecs non résolus | Aucun dans les contrôles exécutés |
| Explorateur public réel, moteur de course, OAuth réel, VPS et déploiement | NON EXÉCUTÉS / non livrés dans ce lot |

Les tests DB et navigateur utilisent exclusivement `typing_test`, créé puis supprimé par `scripts/test-stack.ts`, et le serveur de production local `localhost:3400`. Chrome est installé sur l’hôte et lancé en contextes séparés ; les nouveaux scénarios désactivent les traces de session. Les captures `test-results/navigation-en-mobile.png`, `navigation-fr-mobile.png` et `profile-desktop-dark.png` sont ignorées par Git. Aucun secret ni volume de développement n’a été modifié. Les contrôles hôte utilisent Node 25.6.0, hors de la version 24 prévue ; cette limite demeure explicite. Les chemins initiaux de `next-env.d.ts`, réécrits automatiquement par le build, ont été restaurés et le contrôle de types a repassé.

## Icônes Lucide — 7 octobre 2026

Décision utilisateur : utiliser une bibliothèque réelle pour les icônes au lieu des tracés SVG manuels. `shared/presentation/ui/icon.tsx` assemble désormais douze composants de `lucide-react` 1.52.0, importés par nom et verrouillés dans package.json/pnpm-lock.yaml. Les noms publics, tailles/couleurs Tailwind, props SVG, `aria-hidden` et `focusable=false` sont conservés. Navigation, formulaires, menus et cartes utilisent la même primitive ; personnages illustrés et marque fournie restent distincts.

**Régression avant correction :** le test de rendu échoue car les icônes viennent encore des SVG locaux, sans composant Lucide. Après remplacement, les douze noms rendent les icônes de bibliothèque, et un second test vérifie la personnalisation des classes, attributs et épaisseur de trait.

| Contrôle sur l’état final | Résultat |
| --- | --- |
| Lint, types stricts et frontières | PASS |
| Unitaires | PASS : 91 tests / 27 fichiers |
| Intégrations PostgreSQL jetable | PASS : 31 tests / 14 fichiers ; quatre migrations depuis zéro et replay |
| Build Next.js 16.3.8 Turbopack | PASS |
| E2E Chrome de production | PASS : 41/41 scénarios, dont navigation, langues/thèmes, formulaires, menus et profil |
| Responsive, clavier et accessibilité automatisée | PASS : régressions FR/EN clair/sombre, 360/820/1440 px ; icônes décoratives, focus, menus et labels conservés |
| Inspection visuelle | PASS : capture de navigation EN mobile sombre inspectée |
| App locale déjà lancée | PASS : installation frozen-lockfile de Lucide 1.52.0 dans le volume de dépendances du conteneur ; `/en` sur localhost:3000 retourne 200 avec les icônes Lucide, dont le globe |
| Diff sans erreur d’espacement | PASS |
| Échecs finaux | Aucun dans les contrôles exécutés |
| OAuth réel, VPS et déploiement | NON EXÉCUTÉS dans ce lot |

Tests DB et navigateur exclusivement sur la base PostgreSQL temporaire `typing_test`, créée puis supprimée par `scripts/test-stack.ts`. Serveur E2E local sur localhost:3400, contextes Chrome séparés et traces désactivées pour navigation/profil. La synchronisation du conteneur de développement n’a modifié aucune base ni volume de données. Les contrôles hôte utilisent Node 25.6.0, hors de la version 24 prévue ; l’application Docker utilise Node 24. Les chemins initiaux de next-env.d.ts réécrits par le build sont restaurés et typecheck repasse. Aucun secret affiché ou modifié. Aucun autre numéro de version de dépendance n’est changé ; pnpm normalise aussi les métadonnées facultatives de Sharp, déjà dépendance directe.

## Accueil simple enrichi — 7 octobre 2026

Décision utilisateur : améliorer l’accueil avec un peu de contenu en conservant une interface simple. Cette demande remplace la restriction historique d’un seul lien sans étapes. `composition/home/HomePage` affiche une introduction sur la surface bleue du thème, le CTA principal Rejoindre, trois étapes traduites (code, personnage/pseudo invité, salon et présence) et un encart hôte avec lien de création et restriction aux comptes. Les formulaires restent sur leurs pages dédiées. Tailwind et les primitives Badge, Icon/Lucide et Button réutilisent les tokens clair/sombre. Aucun contrat serveur, module métier, transport, migration, dépendance ou logo modifié.

**Régression avant réalisation :** les deux tests de rendu FR/EN échouent sur le lien hôte absent. Après réalisation, les traductions, étapes, destinations localisées et absence de formulaires à l’accueil sont vérifiées. Les assertions historiques qui interdisaient ce lien dans `auth-page.test.tsx` et le parcours hôte de `play-join.spec.ts` sont adaptées à la nouvelle demande ; le parcours compte ouvre maintenant la création depuis l’encart de l’accueil. Les nouveaux scénarios vérifient aussi que le visiteur ne voit pas le formulaire de création, et que les liens fonctionnent au clavier sans commande lobby au simple affichage.

| Contrôle sur l’état final | Résultat |
| --- | --- |
| Lint, TypeScript strict et frontières | PASS |
| Unitaires | PASS : 94 tests / 27 fichiers |
| Intégrations PostgreSQL jetable | PASS : 31 tests / 14 fichiers ; quatre migrations depuis zéro et replay |
| Build Next.js 16.3.8 Turbopack | PASS : projet et copie de vérification isolée |
| E2E Chrome de production | PASS : 43/43 scénarios dans la copie isolée, dont entrée invité, création depuis l’encart hôte, langues/thèmes, clavier et régressions de présence/profil |
| Responsive et inspection visuelle | PASS : accueil FR/EN à 360/820/1440 px sans débordement, mouvement réduit ; captures EN desktop clair et FR mobile sombre inspectées |
| Accessibilité automatisée | PASS : axe AA FR/EN, clair/sombre à 360 px, avec les nouvelles sections de l’accueil |
| Diff et formatage des fichiers modifiés pour l’accueil | PASS |
| Échecs non résolus | Aucun dans les contrôles exécutés ; les échecs des tentatives initiales restent documentés ci-dessous |
| OAuth réel, VPS, déploiement et Lighthouse | NON EXÉCUTÉS dans ce lot |

Tests DB et navigateur exclusivement sur PostgreSQL temporaire `typing_test`, créé puis supprimé par `scripts/test-stack.ts`. Les premières recettes utilisent localhost:3400 et PostgreSQL au port 55432. La première termine à 41/43 sur deux assertions historiques qui interdisent le lien hôte ; elles sont remplacées par le parcours réel via ce lien. Une réécriture parallèle de la sortie partagée est constatée pendant la seconde recette (40/43) : les tests corrigés du parcours hôte passent, mais trois régressions `sprint.spec.ts` échouent sur le roster après reload, l’erreur de login et la lecture initiale retardée. L’exécution finale passe 43/43 dans une copie temporaire des sources et dépendances, avec sa propre sortie de build, localhost:3417 et PostgreSQL au port 55543. Seuls les ports et le lancement direct des binaires sont adaptés dans le harnais temporaire ; aucun changement de ces scripts/configurations dans le projet. Les sources de l’accueil et les deux catalogues sont comparés à la copie avant et après les tests. Aucun secret local n’y est copié. La copie temporaire est supprimée après les contrôles et la conservation des deux aperçus anonymes.

Les captures anonymes `test-results/home-{locale}-{width}.png` sont ignorées par Git ; aucune session personnelle n’est capturée. Aperçus conservés dans le dossier de visualisation du chat : `homepage-desktop.png` et `homepage-mobile.png`. Les vérifications hôte utilisent Node 25.6.0, alors que le projet cible Node 24 ; aucune nouvelle validation Node 24 n’est revendiquée. Des modifications d’infrastructure parallèles sont préservées ; le contrôle unitaire final inclut leurs trois nouveaux scénarios, soit 94 tests au total.

Les premières tentatives confinées ont rencontré des restrictions d’environnement : cache natif SWC hors des chemins autorisés, compilation Turbopack bloquée, et mémoire partagée PostgreSQL refusée. Le cache SWC est redirigé vers `/private/tmp/typing-swc-native-cache` pour les contrôles, et build/tests DB/browser sont exécutés avec l’autorisation technique adaptée. Aucun contournement dans le code produit. Les chemins de développement de `next-env.d.ts`, réécrits automatiquement par le build, sont restaurés et le contrôle de types repasse. Aucun secret, configuration locale de connexion ni base de développement/production modifié.


## Expulsion par l'hôte — 12 octobre 2026

Lot issu de la revue du cahier des charges : `SALLE-07`, autorisation `SEC-01`, validation `TECH-07`, présentation FR/EN et accessibilité. Module propriétaire : lobby ; contrat et limites dans [ARCHITECTURE.md](ARCHITECTURE.md#expulsion-par-lhôte--12-octobre-2026). Révision de départ `c37542c`, état final local **non commité**. Les modifications antérieures des documents d'infrastructure et `release.txt` sont conservées. Aucun déploiement ni migration d'une base existante.

L'hôte peut expulser un participant ou spectateur depuis le roster, après confirmation traduite. L'interdiction persiste dans PostgreSQL par salle et identité ; elle survit à un autre cookie de session du même compte, refuse le retour et ne bloque pas les autres salles. Les onglets de la personne expulsée perdent leur roster et leurs accès heartbeat/SSE. La version et les présences des autres membres sont actualisées. Aucun bannissement interne n'est publié.

| Contrôle final | Résultat et portée |
| --- | --- |
| Runtime | Node **24.19.0**, Next **16.3.8**, Chrome installé sur macOS |
| Lint, types et frontières | PASS : `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries` ; pas d'avertissement lint final |
| Unitaires | PASS : **101 tests / 28 fichiers**, dont hôte/non-hôte, auto-expulsion, membre absent, présence expirée et contrôles de roster FR/EN |
| PostgreSQL réel | PASS : **36 tests / 15 fichiers** via `pnpm test:integration` ; cinq migrations depuis une DB neuve et replay sans migration restante ; `LobbyBan` persisté, interdiction de retour, concurrence entrée/expulsion et hôte expiré/succession |
| Prisma | PASS : génération et validation du schéma ; migration additive `20261012100000_lobby_bans` et contrainte unique par salle/identité |
| Production locale | PASS : `pnpm build`, avec variables de test ; la nouvelle route `/api/lobbies/[code]/kick` est compilée et typée |
| Navigateurs sur build final | PASS : **16/16 Chromium**, tests `lobby-expulsion`, `lobby-acceptance`, `play-join`, `presence` et `sprint` sur localhost:3118 ; confirmation/annulation, focus clavier, deux onglets expulsés, reload, entrée interdite et régressions du lobby |
| API indépendante sur build final | PASS : **5/5 Chromium** sur localhost:3119, fichier `lobby-expulsion-api.spec.ts` ; vrais appels HTTP, session compte/invité, participant/spectateur, origine étrangère, session absente, identité agissante injectée, schémas stricts, auto-expulsion/non-hôte/membre absent, reprise avec nouvelle session du compte, autre salle, double commande concurrente et succession d'hôte |
| Accessibilité et inspection | PASS : deux contrôles axe WCAG A/AA de la confirmation dans `main`, FR sombre **360 px** et EN clair **1280 px** ; captures de confirmation inspectées, sans débordement horizontal |
| Diff et matrice | PASS : `git diff --check` ; **90 exigences officielles uniques** conservées ; architecture, statut `SALLE-07` et preuve `SEC-01` mis à jour |

**Rouge avant réalisation/correction :** les deux nouvelles assertions unitaires de roster attendaient un contrôle d'expulsion absent. La revue a ensuite constaté une recherche de codes possible via l'API d'expulsion : un appel non autorisé distinguait un code connu (`403`) d'un code inconnu (`404`). Le test ajouté a reproduit `[403, 404, 403, 404, 404]`, puis passe avec cinq `403` après le précontrôle d'appartenance. Il vérifie aussi qu'un membre expiré et une salle étrangère ne sont pas modifiés par ces appels. L'autorisation hôte reste revérifiée sous verrou après ce précontrôle. La suite HTTP indépendante a rejoué les codes existants/inexistants et le contrôle de version de la salle étrangère sur le build corrigé.

**Échecs intermédiaires :** cache natif SWC hors sandbox, compilation confinée bloquée et mémoire partagée PostgreSQL refusée ; le cache est redirigé vers `/private/tmp/web5-expulsion-swc` et les contrôles locaux exécutés avec l'autorisation technique adaptée. Des assertions de fixtures d'intégration et un username E2E dépassant 20 caractères ont été corrigés avant les runs finaux. **Échecs finaux non résolus : aucun dans les contrôles exécutés.** Les imports de développement de `next-env.d.ts`, automatiquement réécrits par le build, sont restaurés et `typecheck` repasse.

**Non exécutés :** autres fichiers E2E hors des régressions du lobby sélectionnées, Firefox/WebKit, lecteur d'écran et appareil tactile réels, charge/Lighthouse, OAuth externe, VPS HTTPS et déploiement. Invitations et révocation des liens restent futures (`SALLE-04`) ; `SALLE-07` demeure donc **partiel** dans la matrice. Les interdictions sont attachées à l'identité de session, sans prétendre reconnaître une nouvelle identité invitée par pseudo ou IP. Les bases jetables et serveurs de recette sont arrêtés puis supprimés après les runs. Aucune base de développement/production ni aucun secret n'a été modifié.

## Salons publics — 12 octobre 2026

Demande utilisateur : implémenter les salons publics et les relier à « Voir les salons ». Module propriétaire : lobby ; `SALLE-03`, explorateur partiel `JOIN-02`, `TECH-07` et présentation FR/EN. Arbre local non commité ; modifications antérieures d'expulsion et d'infrastructure conservées.

La création valide et persiste `PUBLIC | CODE`, avec défaut `CODE` pour les anciennes salles/clients. `/lobbies` lit les résumés réels via le service lobby et les actualise sans navigation toutes les cinq secondes via `GET /api/lobbies`. La page montre nom, code, hôte, état, participants/capacité et spectateurs ; elle distingue erreur et liste vide. Les liens ouvrent le parcours réel de session/personnage/adhésion. Le choix participant/spectateur est désormais disponible à l'entrée ; une salle pleine peut recevoir un spectateur. Les salles fermées, sur code ou sans compte vivant sont exclues. Lire la liste ne renouvelle pas la présence.

| Contrôle final | Résultat et portée |
| --- | --- |
| Runtime | Node **24.19.0**, Next **16.3.8**, Chrome installé sur macOS |
| Lint, types et frontières | PASS : lint, typecheck et `check:boundaries` |
| Unitaires | PASS : **112 tests / 31 fichiers**, dont visibilité validée/défaut, panne sans faux succès, résumés sans mutation, succession déterministe, page FR/EN, choix de rôle compte/invité, polling/reprise/annulation |
| PostgreSQL jetable | PASS : **38 tests / 16 fichiers**, six migrations depuis zéro puis replay sans migration restante ; salles publiques seulement, comptes de rôles, exclusion des expirations, absence de renouvellement, lecture anonyme sans cache/query stricte et retrait des salles fermées |
| Build | PASS : build de production avec `/[locale]/lobbies` et GET/POST `/api/lobbies` compilés ; second build après ajout du choix de rôle |
| Navigateurs | PASS : **12/12 Chromium** sur localhost:3400 ; `public-lobbies.spec.ts`, `navigation.spec.ts` et `play-join.spec.ts` sur le build final avec PostgreSQL jetable |
| Parcours publics | PASS FR/EN : création Publique par compte, salle Sur code invisible, découverte sans session, entrée invitée, places pleines, entrée spectateur, compte de spectateurs actualisé sans recharger, fermeture puis liste vide, panne de rafraîchissement et reprise manuelle |
| Accessibilité et rendu | PASS : axe WCAG A/AA en **360 et 1440 px**, puis thème sombre, pas de débordement horizontal ; capture sombre de la liste inspectée |
| Diff et documentation | PASS : diff sans erreurs d'espacement ; architecture, guide local et matrice mis à jour, 90 IDs officiels uniques conservés, statuts `SALLE-03` et `JOIN-02` conservés partiels |

**Rouge avant réalisation :** six tests visibilité/service/page échouaient avec l'attente et l'absence de service public. La première recette navigateur révèle le rôle fixé à participant : les deux tests publics attendent en vain le choix spectateur ; le scénario d'état vide suivant échoue car ces salles n'ont pas été fermées. Quatre nouveaux tests unitaires reproduisent l'absence du choix pour compte/invité FR/EN. Ajout de `LobbyRolePicker`, transmission du rôle choisi au payload serveur et nouvelle recette : 112 unitaires et 12 E2E passent.

**Restrictions initiales :** PostgreSQL confiné échoue sur `shmget` et SWC sur son cache natif hors sandbox. Les tests jetables et builds sont relancés avec l'autorisation technique adaptée et réussissent. Aucun correctif de contournement dans le produit. Les chemins de développement de `next-env.d.ts` réécrits par le build sont restaurés. Échecs finaux non résolus dans les contrôles exécutés : aucun.

**Développement local :** cible `.env` vérifiée sans afficher de secret : hôte loopback, port 5432, base `typing_dev`, utilisateur `typing`, identiques au guide local. Les services du projet `typing-local` sont en marche. La lecture des migrations trouve les quatre premières versions ; `prisma migrate deploy` applique uniquement les migrations additives `20261012100000_lobby_bans` (changement antérieur déjà présent) et `20261012110000_public_lobbies`. Le client Prisma du conteneur est régénéré puis seul le service applicatif est redémarré ; aucun reset ni suppression de volume. Les tests n'utilisent jamais cette base de développement. Contrôles HTTP après redémarrage : `/en/lobbies`, `/fr/lobbies` et `/api/lobbies` retournent 200 ; la liste publique est vide, aucun salon de démonstration créé dans la base locale. Aucune migration de production ni déploiement.

**Non exécutés et limites :** autres fichiers E2E, Firefox/WebKit, lecteur d'écran/appareil tactile, charge/Lighthouse, OAuth externe, VPS HTTPS et déploiement. La liste publie les 100 premières salles, sans pagination. Langue/complexité et filtres restent futurs avec la configuration de course (`JOIN-02` partiel) ; invitations et Privée restent futures (`SALLE-03/04`). Course, bots et bonus non réalisés dans ce lot. Les bases de recette sont arrêtées puis supprimées par le harnais.

## Salle sans navigation et modales — 12 octobre 2026

Demande utilisateur : retirer la barre pendant l'entrée/dans la salle pour éviter une sortie apparente par les liens du site, et remplacer la confirmation d'expulsion intégrée à la carte par une modale réutilisable. Présentation dans composition/play et shared ; l'expulsion reste propriétaire du module lobby. Arbre local non commité ; tous les changements antérieurs sont conservés.

`PlayNavigation` retire le slot de navigation sur `/play/player` et `/play/room` uniquement. Le lien d'évitement, main et footer restent disponibles ; les pages code/création gardent la barre. La sortie explicite reste une commande serveur. `Modal` et `ConfirmationModal` dans shared fournissent premier plan natif, fond inerte, titre/description, scroll verrouillé, clavier, annulation et restauration du focus. Le roster ouvre la confirmation hors des cartes. L'envoi attend `OperationResult`, bloque les doubles confirmations/annulations en cours, conserve la fenêtre avec l'erreur en cas d'échec et ferme sur succès. Les textes FR/EN existants sont réutilisés.

| Contrôle final | Résultat et portée |
| --- | --- |
| Runtime | Node **24.19.0**, Next **16.3.8**, Chrome installé sur macOS |
| Lint, types et frontières | PASS ; premier avertissement de cleanup de ref corrigé en capturant le repli de focus avant le cleanup |
| Unitaires | PASS : **118 tests / 33 fichiers**, suppression du slot aux deux routes, conservation aux entrées, noms/descriptions distincts des modales, modal fermée sans contenu, contrôle hôte FR/EN |
| PostgreSQL jetable | PASS : **38 tests / 16 fichiers** ; six migrations depuis zéro et replay, autorisations/invariants/présence inchangés |
| Build | PASS : build de production avec navigation conditionnelle et composants de modale |
| Première recette navigateur | **21 PASS / 1 assertion obsolète** sur 22 scénarios : `lobby-acceptance`, `lobby-expulsion`, `navigation`, `play-join`, `public-lobbies`, `presence`, `sprint` ; reconnexion réseau réussie, puis le test cherchait le bouton de langue retiré de la salle |
| Reprise finale ciblée | PASS : **3/3 Chromium**, les deux modales FR/EN avec retour du focus au roster après suppression et présence/reconnexion/route FR ; **22 scénarios distincts validés** sur le build final en combinant les deux runs |
| Modales et accès | PASS FR sombre **360 px** et EN clair **1280 px** : dialogue natif visible hors des cartes, focus initial Annuler, Tab/Shift+Tab, Échap, clic du fond, bouton Annuler et restitution du focus ; aucune suppression sur annulation |
| Commande en attente/erreur | PASS : panne HTTP simulée uniquement dans ce sous-scénario de présentation ; boutons désactivés et Échap sans fermeture pendant l'envoi, erreur traduite dans la modale, roster conservé puis nouvelle confirmation avec vraie API réussie |
| Retour à la salle | PASS FR/EN : pas de navigation sur joueur/salle ; retour par l'éditeur et reload gardent deux membres, sortie explicite retire l'adhésion ; reprise après conflit d'une autre salle inchangée |
| Accessibilité et rendu | PASS : axe WCAG A/AA des modales, screenshots mobile sombre et desktop clair inspectés ; pas de débordement horizontal, tailles adaptées et scène derrière le fond |
| Application locale | PASS : `/en/play` retourne 200 avec barre, `/en/play/player?code=ABC234` et variante FR retournent 200 sans barre ; lecture anonyme seulement, aucun compte/salon créé ni mutation de base |

**Rouge avant réalisation :** quatre assertions reproduisent la navigation présente aux routes de session et l'absence de déclencheur de dialogue dans les cartes FR/EN. Elles passent après réalisation. La recette présence initiale valide les coupures invité/hôte et les identités inchangées (arrivée 1323 ms ; reprises 14 700/14 769 ms), puis dépasse son délai en cherchant un bouton de langue de la barre supprimée. Le test utilise désormais un accès à la route FR de la même salle et recontrôle les identités ; les traces de ce scénario sont désactivées et la trace générée par ce premier échec est supprimée.

**Non exécutés :** autres fichiers E2E, Firefox/WebKit, appareil tactile/lecteur d'écran, charge/Lighthouse, OAuth réel, VPS HTTPS et déploiement. Aucune migration nécessaire à ce changement de présentation. Tests DB et navigateur exclusivement sur la base jetable et serveur localhost:3400 ; aucun secret modifié ou publié. La suppression de la barre ne transforme pas l'historique du navigateur en départ volontaire ; règles serveur et expiration restent inchangées. Aucun statut de conformité officiel relevé.

Recette ciblée finale : arrivée 813 ms, reprise invité 15 231 ms et hôte 14 724 ms ; identité hôte et ensemble des IDs membres inchangés après chaque coupure et après accès à la route FR. Échecs finaux non résolus : aucun dans les contrôles exécutés. `next-env.d.ts` restauré puis contrôle de types final réussi ; diff sans erreurs d’espacement et 90 IDs officiels uniques conservés.

## Retours d'inscription — 12 octobre 2026

Demande utilisateur : une adresse email déjà utilisée doit afficher un retour précis à l'inscription. Module identity ; `AUTH-01`, `I18N-01`, `A11Y-04`. Arbre local non commité, changements précédents préservés. La cause est le mapping UI : Better Auth retourne `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, mais `mapAuthError` le traduisait en `errors.CONFLICT`, qui évoque une salle. Le code de doublon username était aussi ramené à ce message.

Les deux catalogues possèdent maintenant `authErrors.emailTaken` (connexion ou autre email) et `authErrors.usernameTaken` (autre identifiant). L'alert existante conserve le formulaire et les valeurs après refus ; corriger les champs permet une vraie inscription. Les codes et contrôles Better Auth, les sessions, les identités, l'origine et la limitation restent inchangés. Aucun endpoint de disponibilité, hasher, session, récupération ou fusion de comptes ajouté.

| Contrôle final | Résultat et portée |
| --- | --- |
| Runtime | Node **24.19.0**, Next **16.3.8**, Better Auth **1.7.7**, Chrome installé sur macOS |
| Lint, types, frontières | PASS : lint, typecheck et `check:boundaries` |
| Unitaires | PASS : **121 tests / 33 fichiers**, clés spécifiques email/username, traduction FR/EN, login/limitation inchangés et erreurs fournisseur inconnues masquées |
| PostgreSQL jetable | PASS : **39 tests / 16 fichiers**, six migrations depuis zéro puis replay ; vraie réponse email dupliqué insensible à la casse (`422`), code username distinct, aucun nouveau compte ni cookie de session lors du refus |
| Build | PASS après correction du typage d'une donnée du test ; build final compile les messages et leur utilisation par le formulaire existant |
| Navigateurs sur le build final | PASS : **6/6 Chromium**, `signup-feedback.spec.ts` et `sprint.spec.ts` sur localhost:3400 avec DB jetable ; vraie erreur email/username FR/EN, maintien des valeurs et de la route, aucun faux succès/session, correction puis création/connexion réelles, régressions de login et lobby |

**Rouge avant correction :** trois assertions reproduisent la clé générique et les phrases de conflit de salle pour email et identifiant. Elles passent avec les nouvelles clés. Le premier contrôle de types/build a aussi détecté un accès `email` hors du type minimal du helper de test (`{ id: string }`) ; le test utilise désormais l'email qu'il a envoyé, sans élargissement du helper ni suppression de type.

**Non exécutés :** autres fichiers E2E hors de la recette sélectionnée, Firefox/WebKit, lecteur d'écran/appareil tactile, charge/Lighthouse, OAuth externe, production et déploiement. Aucune migration requise et aucune inscription de diagnostic dans la base locale de développement. Toutes les inscriptions automatisées de recette utilisent uniquement la base jetable ; traces du nouveau scénario désactivées. Les bannissements de salles restent conservés, ce lot porte sur le retour d'inscription.

Contrôles finaux de ce lot : `next-env.d.ts` restauré, typecheck et diff sans erreurs d’espacement, 90 IDs officiels uniques conservés. Échecs finaux non résolus : aucun dans les contrôles exécutés.

## Partie rapide — 12 octobre 2026

Lot demandé pour ajouter une fonctionnalité manquante : `JOIN-03`, règle `DEC-06`, validation `TECH-07`, présentation FR/EN et accessibilité. Module propriétaire lobby ; composition pour session et navigation. Révision de départ `c37542c`, arbre local **non commité**, modifications précédentes conservées. [Contrat et limites](ARCHITECTURE.md#partie-rapide--12-octobre-2026). Le statut de la matrice reste partiel : les sous-critères sont implémentés et vérifiés localement, mais la preuve liée à un commit et la recette VPS sont absentes.

Depuis Voir les salons, Trouver un salon sélectionne le salon public joignable non plein avec le moins de places de participant restantes, puis la date de création et l'ID stable. Le navigateur ouvre le vrai parcours de pseudo/personnage/session. Les spectateurs ne consomment aucune place ; présence expirée, états non joignables, salles sur code et bannissements sont exclus. La recherche dépasse la limite de 100 de l'explorateur grâce aux pages internes PostgreSQL. Sans candidat, seul un compte reçoit une proposition explicite de création. Aucun siège réservé, renouvellement de présence ou départ automatique. L'entrée effective revérifie les invariants sous transaction.

| Contrôle final | Résultat et portée |
| --- | --- |
| Runtime | Node **24.19.0**, Next **16.3.8**, PostgreSQL embarqué **18.4**, Chrome installé sur macOS |
| Lint, types et frontières | PASS : `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries` ; imports de développement `next-env.d.ts` restaurés après le build |
| Unitaires | PASS : **128 tests / 35 fichiers**, dont quatre nouveaux scénarios de sélection et trois HTTP : capacités différentes, spectateurs, dates/ID, exclusions, page suivante, panne sur une page suivante, session officielle, query forgée, absence de cookie invité et état vide distinct d'une panne |
| PostgreSQL jetable | PASS : **43 tests / 17 fichiers**, six migrations depuis zéro et replay sans migration restante ; quatre nouveaux scénarios : tri et absence de mutation, bannissement/expiration/états, dernière place concurrente (un succès et un `ROOM_FULL`), meilleur candidat après 100 salles |
| Build de production local | PASS : `pnpm build` sous Node 24 avec valeurs fictives locales ; nouvelle route `/api/lobbies/quick` compilée et typée |
| Navigateurs sur le build final | PASS : **22/22 Chromium**, sept fichiers `quick-play`, `public-lobbies`, `lobby-acceptance`, `sprint`, `play-join`, `presence`, `lobby-expulsion` sur **localhost:3120** avec DB jetable ; trois nouveaux scénarios : vraie sélection/entrée invitée FR/EN, exclusion d'une salle devenue pleine, aucun siège attribué au clic, états vides compte/invité, lien de création et panne/réessai |
| Accessibilité et inspection | PASS : six analyses axe WCAG A/AA dans `main` (FR/EN, clair à 360/1280 px puis sombre à 1280 px), sans débordement horizontal ; capture sombre desktop inspectée : `test-results/quick-play-desktop-dark.png`, ignorée par Git |
| Documents et diff | Architecture, `JOIN-03` et `DEC-06` actualisés ; 90 IDs officiels uniques conservés ; `git diff --check` sans erreur |

**Rouge avant implémentation :** les quatre nouveaux tests unitaires échouaient avec `findQuickLobby is not a function`, puis passent avec la sélection réelle. Les premières vérifications confinées utilisent Node hôte 25.6.0 et passent pour lint/types/frontières/unitaires ; le lancement de PostgreSQL y échoue sur la mémoire partagée (`shmget: Operation not permitted`). L'intégralité des contrôles finaux ci-dessus utilise ensuite Node 24 et une autorisation technique d'exécution adaptée pour PostgreSQL, build et navigateur. La base `typing_test` est créée puis supprimée par `scripts/test-stack.ts` ; aucune base existante n'est réinitialisée et aucun secret n'est modifié ou affiché.

**Échecs finaux non résolus : aucun dans les contrôles exécutés. Non exécutés :** autres fichiers E2E hors de cette recette, Firefox/WebKit, appareil tactile/lecteur d'écran, charge/Lighthouse, OAuth externe, recette VPS et déploiement. Aucun changement de migration requis par Partie rapide. La lecture par pages n'est pas une réservation ni un instantané transactionnel global : un changement concurrent entre le clic et l'entrée peut donner le refus d'entrée existant, sans dépassement de capacité ni faux succès. Les traces des nouveaux scénarios sont désactivées.

## Course humaine — 8 novembre 2026

Demande utilisateur : « make the race », après la proposition d'une course humaine complète depuis le lobby. Révision de départ `2f680af`, modifications non commitées. Propriétaire : module lobby, avec composition HTTP/session et façades publiques existantes. [Contrat détaillé](ARCHITECTURE.md#course-humaine--demande-utilisateur-du-8-novembre-2026), [plan exécuté](superpowers/plans/2026-11-08-human-race.md). Les mêmes 90 IDs officiels sont conservés ; les lignes concernées restent partielles tant que leurs preuves finales/variantes manquent.

Fonctionnement livré : réglages FR/EN, 10–100 mots, correction obligatoire/libre, temps absent ou 30–600 secondes ; démarrage hôte avec deux humains ; texte révélé au décompte 3–2–1 ; saisie avec erreurs/curseur, progression et métriques calculées serveur ; piste partagée et spectateurs ; reprise du brouillon acquitté, abandon confirmé, fin par délai ou statuts terminaux ; podium/tableau, préparation suivante et fermeture. Les résultats et séries MPM des comptes sont persistés, sans historique invité. Corpus initial original bilingue inséré par migration. Les étapes simples de corpus ne réalisent pas le dictionnaire et les filtres avancés.

| Contrôle | Résultat et portée |
| --- | --- |
| Runtime final | Node **24.19.0**, pnpm **11.19.0**, Next **16.3.8**, PostgreSQL embarqué **18.4**, Chrome installé sur macOS. Runtime Node isolé dans `/tmp`, installation système inchangée. |
| Lint | PASS : `pnpm lint` sous Node 24. |
| Types stricts et frontières | PASS : `pnpm typecheck`, `pnpm check:boundaries`. Aucun `any` ni suppression de type ajoutés. |
| Unitaires | PASS : **138 / 37 fichiers**, dont neuf scénarios de domaine de course et un de prévisualisation de frappe. |
| PostgreSQL jetable | PASS : **47 / 18 fichiers**, sept migrations depuis zéro et replay sans migration restante. Quatre scénarios de course couvrent démarrages concurrents, autorisation, séquences/idempotence, confidentialité du brouillon, résultats comptes seulement, replay et fermeture, échéance atteinte avant relance, origine étrangère et champs acteur/score forgés. |
| Build production | PASS : `pnpm build` sous Node 24, variables fictives locales ; route `/api/lobbies/[code]/race/[command]` compilée. |
| HTTP/SSE production | PASS : `SMOKE_BASE_URL=http://localhost:3125 pnpm test:http`, DB jetable et processus de test distinct de l'app locale sur 3000. Session officielle, refus invité/origine/champs forgés, création/entrée, duplication, SSE et révocation. |
| Navigateur complet | PASS : **60/60 Chromium / 17 fichiers**, sans retry, **6,6 minutes**, build de production sur localhost:3124 et PostgreSQL jetable. Les deux scénarios de course couvrent chacun deux humains et un spectateur, textes identiques, refus de démarrage invité, collage refusé, erreur bloquante puis correction, reprise du brouillon après reload, arrivée des deux humains, résultats après reload, replay, mobile, annulation et confirmation d’abandon, puis fermeture. |
| Accessibilité et visuel | PASS : axe A/AA sur course et résultats (EN clair / FR sombre), contrôles existants à 360 px et deux thèmes ; captures `test-results/race-live-{en,fr}.png` et `race-results-{en,fr}.png`, ignorées par Git. Résultats clairs et course sombre inspectés visuellement. |
| Application locale | PASS : après migration/restart, `/fr` retourne 200 et `/api/lobbies` retourne 200 avec `ok: true`. Aucun compte de test créé dans typing_dev. |

**Rouge puis vert :** le test de domaine échoue d'abord car le moteur n'existe pas ; le test d'intégration échoue car l'adaptateur de commande n'existe pas. Les cas supplémentaires de fermeture et de relance au délai échouent ensuite explicitement : agrégat invité conservé à la fermeture et effacement prématuré avant sauvegarde. Le repository purge désormais le JSON des salles fermées tout en sauvegardant les comptes ; une première commande de relance qui constate le délai commite les résultats et refuse la relance avant le second appel. Les tests de régression passent.

**Essais intermédiaires conservés :** un test de timeout oubliait les heartbeats et obtenait correctement un abandon ; sa fixture conserve désormais les présences. Le premier build détecte la clé de traduction Annuler absente, ajoutée dans les deux langues. Le lint détecte un appel à l'horloge pendant le rendu ; l'échantillonnage est déplacé dans l'effet. Le premier run d'intégration sous Node hôte 25.6 rencontre un timeout de 5 s du scénario existant à plus de 100 salles ; tous les runs finaux utilisent la version 24 imposée, et la suite entière passe sans élargir ce timeout. L'ancien test clavier du rôle omettait le sélecteur de visibilité entre rôle et personnage ; son attente suit désormais le véritable ordre de tabulation.

**État local de développement :** le conteneur applicatif existant est bien celui du checkout, avec cible `postgres:5432/typing_dev`. Son PostgreSQL était arrêté ; le port hôte 5432 appartient à un autre service. Le conteneur PostgreSQL du projet est relancé sur **127.0.0.1:55434**, avec son volume existant. Les six migrations existantes et l'unique migration de course en attente sont vérifiées avant `prisma migrate deploy` ; seule cette migration est appliquée. L'application est relancée pour charger le client généré. Aucune base inconnue ou de production n'est migrée, aucun volume n'est supprimé, aucun fichier secret n'est modifié. Utiliser le même `POSTGRES_PORT=55434` aux prochaines commandes Compose ([guide](DEVELOPPEMENT-LOCAL.md#course-humaine-8-novembre-2026)). Cette DB n'est jamais utilisée pour les tests.

**Limites :** bots, bonus, complexité/options de texte/dictionnaire, graphiques, records personnels, profil statistique et historique paginé restent futurs. La reconnexion utilise la présence existante à 30 s ; seuls les lots déjà acquittés survivent à un reload. Le protocole en lots/instantanés limite les bonds de progression et conserve l'autorité serveur ; il ne prouve pas qu'un humain utilise physiquement un clavier. Pas de mesure de charge à 30 joueurs, Lighthouse, Firefox/WebKit, appareil tactile/lecteur d'écran réels, OAuth externe ou recette VPS. Aucune publication ni déploiement de production effectué.

**Bilan final :** aucun échec applicatif non résolu dans les contrôles exécutés. Les scénarios non exécutés sont listés dans les limites ci-dessus. Les bases temporaires sont supprimées par leur harnais ; seul le PostgreSQL de développement, avec son volume initial et le nouveau port hôte, reste démarré. Les imports de développement initiaux de `next-env.d.ts` sont restaurés après le build ; aucune modification de ce fichier généré n’est retenue.

## Boîtes mystères — 8 novembre 2026

Demande utilisateur : ajouter six effets pendant la course pour resserrer les écarts ; correction explicite « aider les retardataires », puis accord sur les six effets et leur implémentation. Cette section remplace la limite historique « bonus futurs » de la recette de course ci-dessus. Arbre de travail non commité conservé, aucune publication. Propriétaire lobby, exigences BONUS-01–04, CONF-09 et colonne bonus de RES-02. [Contrat et choix](ARCHITECTURE.md#boîtes-mystères--demande-et-accord-utilisateur-du-8-novembre-2026), [spécification](superpowers/specs/2026-11-08-mystery-boxes-design.md), [plan et journal](superpowers/plans/2026-11-08-mystery-boxes.md).

Implémentation : boîtes serveur aux checkpoints 25/50/75 %, uniquement dernier ou retard strictement supérieur à 25 points, maximum trois ; inventaire personnel à activation manuelle ; raccourci −3 mots, détour +3 mots au meneur actif, brouillard 4 s, bouclier, éclaircie, petit coup de pouce −1 mot. Effets et consommation atomiques dans le verrou de salle, réévaluation d'utilité et de cible, textes personnels versionnés, MPM sans frappes offertes, événements sur piste et chez la cible. Le réglage est modifiable par l'hôte en attente ; les anciennes courses gardent leurs règles sans bonus.

### Passé

| Contrôle sur l'état final | Résultat et portée |
| --- | --- |
| Runtime | Node 24.19.0/pnpm 11.19.0 sur hôte ; PostgreSQL jetable embarqué 18.4 ; Chrome installé. Conteneur de développement Node 24.21.0. |
| Lint / types / frontières | PASS : `pnpm lint` sans avertissement, `pnpm typecheck`, `pnpm check:boundaries`. Aucun `any` explicite ni suppression de type ajoutés. |
| Unitaires | PASS : **158 / 39 fichiers**. Quatorze tests bonus : checkpoints sautés et uniques, plafond trois, égalités, dernier OU écart strict, arrondi exact 55−30, désactivation, tirage reproductible et six types atteignables, six effets/expiration/protection, appartenance/utilité/idempotence, statistiques, révisions, frontières de mots et anciens agrégats. Trois tests de frappe dont retours arrière sur suffixe retiré. Quatre rendus UI FR/EN dont brouillard et spectateurs. |
| Intégration PostgreSQL jetable | PASS : **49 / 18 fichiers** ; huit migrations depuis zéro puis replay sans migration restante. Activation concurrente d'un même objet, propriétés/refus acteur et cible/type forgés, reprise de texte/révision depuis DB, frappe périmée rejetée, compteurs de bonus comptes sauvegardés et invités sans historique. |
| Build | PASS : `pnpm build` Node 24, cache SWC temporaire et variables de build factices. Aucun accès métier ni migration d'une DB réelle au build. |
| Navigateur pertinent | PASS : **11/11 Chromium / 3 fichiers**, **1,5 minute**, sans retry, serveur de production isolé `localhost:3100`, PostgreSQL jetable. `race.spec.ts` : quatre scénarios, dont deux nouveaux FR/EN de boîte réellement attribuée, persistance après reload, bouton d'activation, effet serveur annoncé au spectateur, répétition idempotente, compteur, absence d'inventaire spectateur et mobile. Deux scénarios course complète/reprise/résultats/replay/abandon. `presence.spec.ts` : reconnexion hôte/invité et identité/roster conservés. `select.spec.ts` : six régressions de menus clavier, tablette, FR/EN, clair/sombre et 360 px. |
| Accessibilité / visuel | PASS : axe A/AA sur inventaire/boîtes (FR sombre, EN clair), ainsi que course/résultats et menus existants. Captures `test-results/mystery-boxes-fr.png` et `mystery-boxes-en.png` inspectées : cartes, piste, textes, contrôles et deux thèmes lisibles. Pas de débordement à 360 px. Les deux tirages observés dans le navigateur ont produit un détour ; les six effets sont couverts par le domaine, sans forcer le tirage dans l'API. |
| Développement local | Cible vérifiée sans afficher l'URL ni identifiants : Compose `typing-local`, mode development, `postgres:5432/typing_dev`, port hôte PostgreSQL conservé 55434. Statut : seule `20261108150000_race_bonuses` en attente ; cette migration additive est appliquée, puis seule l'app est redémarrée pour régénérer Prisma. `/fr` retourne HTTP 200. Aucun reset/volume supprimé, aucun compte/salle de test créé dans typing_dev. |
| Revue indépendante | Deux défauts reproduits et corrigés avec régressions : blocage à 100 % à une frontière exacte de mot ; retours arrière en vol effaçant des caractères valides après raccourcissement. Le reviewer revérifie les corrections et exécute les tests ciblés. |

### Échecs intermédiaires résolus

- RED attendu : tests bonus/UI échouent avant leurs composants/règles ; test d'intégration échoue avant `useItem`. Les régressions de frontière de mot et de seuil flottant échouent réellement avant correction. Les tests finaux passent.
- Une fixture initiale arrondissait 24 % vers le haut et atteignait exactement 25 % ; la distribution était correcte. La fixture utilise un entier restant sous le seuil.
- Le sandbox refuse la mémoire partagée PostgreSQL ; les tests tournent ensuite avec autorisation d'exécution locale et base temporaire. Le build initial refuse le cache SWC système ; il passe avec cache dans `/private/tmp`. Node hôte 25 est remplacé par le runtime Node 24 existant dans `/private/tmp`, sans changer l'installation système.
- Un run d'intégration simultané au build dépasse le timeout du premier test seed ; son nettoyage n'ayant pas eu lieu, le seed suivant échoue sur la collision conservée. La suite entière rejouée seule passe 49/49, sans modifier les tests de seed ni augmenter leurs délais.
- Premier lancement navigateur refusé : port 3000 déjà occupé par l'application de développement. Aucun processus existant n'est arrêté ; la recette passe sur le port isolé 3100.

### Non exécuté / limites

Pas de nouvelle recette de l'ensemble des autres fichiers E2E, Firefox/WebKit, lecteur d'écran ou appareil physique, charge soutenue à 30 joueurs, Lighthouse, OAuth externe ou production/VPS. Aucun bot livré par ce lot. Le brouillard est un effet de présentation sur des données autorisées, pas une preuve anti-triche matérielle. L'historique paginé et les graphiques restent futurs. Aucun échec applicatif non résolu dans les contrôles exécutés ; aucune migration de base inconnue/production ni déploiement.

## Configuration de course §4.5 — 9 novembre 2026

Arbre local déjà modifié avant ce lot, sans commit de livraison ni déploiement. Propriétaire lobby, exigences CONF-01–12 et prise en charge des places bots nécessaires à CONF-10. Source de vérité du contrat : [architecture](ARCHITECTURE.md#configuration-de-course-45--demande-utilisateur-du-9-novembre-2026) et [corpus](CORPUS.md).

### Passé

- `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries` : PASS sur l'état final ; aucun import intermodule ajouté.
- `pnpm db:validate`, `pnpm db:generate` : PASS.
- `pnpm test:unit` : **166 tests, 41 fichiers PASS**, dont nouvelles régressions configuration/texte : limites temporelles, droits/états, changement atomique de capacité/visibilité, place des bots, au moins un humain, déterminisme/reprise/version de moteur, exactitude de longueur, complexités, options indépendantes et filtres impossibles.
- `pnpm test:integration exec vitest run tests/integration --testTimeout 30000` : **52 tests, 18 fichiers PASS** sur PostgreSQL jetable, migrations depuis zéro puis deuxième déploiement sans migration en attente. Corpus/dictionnaire bilingues réels, tous modes/niveaux, sauvegarde et relecture complète, refus atomique sans changement de version, historique des comptes seulement et concurrence ajout de bot/dernière place humaine.
- `SWC_NATIVE_BINDING_CACHE=/private/tmp/typing-swc-native pnpm build` : PASS, build de production Next.js 16.3.8. Exécution locale autorisée hors bac à sable pour le cache natif et les processus nécessaires à Turbopack.
- Régressions finales : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' PLAYWRIGHT_BASE_URL=http://localhost:3109 pnpm test:browser race.spec.ts public-lobbies.spec.ts quick-play.spec.ts lobby-acceptance.spec.ts presence.spec.ts` : **16/16 PASS en 2,5 min**, sur build final et migrations/dictionnaires finaux. Inclut course humaine, bonus, configuration/bots FR/EN, salle/hôte spectateur, capacité, reconnexion, découverte publique et partie rapide avec reprise après panne.
- Deux nouveaux E2E FR/EN : PASS sur Chrome installé, serveur production port 3109 et PostgreSQL jetable. Formulaire réel, options désactivées en cohérent, ajout/retrait/niveau de bot, filtres de génération, indépendance UI EN/texte FR, sauvegarde partagée avec spectateur, persistance après reload, verrouillage en course, progression réelle du bot, résultats et réglages de la prochaine course figés séparément, replay. Axe WCAG A/AA et 2.1 AA : aucune violation dans le formulaire testé.

### Échecs intermédiaires résolus

- Les tests de configuration ajoutés échouaient avant les champs/règles de bots et de salle ; les tests de génération échouaient avec l'absence du générateur. Le refus d'une version de bot inconnue et la frappe d'un bot exactement à l'échéance ont été testés rouge puis vert.
- PostgreSQL était bloqué par `shmget` dans le bac à sable ; relancé avec autorisation sur une DB temporaire dédiée. Le premier run large avait un timeout de cinq secondes dans `seed-s1.test.ts` (« seeds two credential-free users… concurrently… ») ; la suite complète passe avec `--testTimeout 30000`.
- Le premier run E2E élargi a eu six échecs : sélecteur « Public/Publique » ambigu dans les deux scénarios de création publique, puis deux scénarios de partie rapide et leurs deux scénarios de reprise influencés par les salles laissées ouvertes après ces échecs. Le test cible maintenant le paragraphe de visibilité de la salle ; nouvelle exécution sur DB neuve : les six scénarios passent. Un run suivant a révélé une lecture E2E trop rapide après le clic Démarrer dans le nouveau scénario FR ; le test attend maintenant la piste rendue après la réponse serveur avant de lire le snapshot. Le passage final des 16 scénarios est entièrement vert.
- Le cache SWC par défaut était interdit et `/tmp` était refusé par son contrôle de lien symbolique. Chemin physique `/private/tmp`, puis build hors bac à sable après arrêt du seul processus de build de cette tâche : PASS.
- Port 3000 déjà occupé : tests isolés sur 3109 sans arrêter l'autre serveur. Chromium Playwright absent : utilisation du Chrome installé via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, sans installation de navigateur ni modification des dépendances.

### Non exécuté / limites

- Toutes les commandes ont utilisé Node **25.6.0** disponible sur cette machine, avec avertissement du moteur attendu `>=24 <25` ; cette recette ne certifie pas Node 24.
- Aucune migration d'une DB de développement/production existante, aucun déploiement, OAuth réel, test de charge à 30 joueurs, ni certification exhaustive des profils de bots. Les migrations ont été appliquées uniquement dans les bases jetables du harnais.
- Visibilité privée et invitations de SALLE-03 restent futures ; ce lot édite réellement les modes PUBLIC/CODE existants. Les options de caractères et le nombre de mots portent sur le texte initial ; les bonus gardent leur comportement de modification du texte personnel.
- Le corpus et le dictionnaire initial sont volontairement finis ; un filtre sans mot compatible refuse le départ. Les critères de difficulté, sources et droits sont documentés dans CORPUS.md. Les réglages exigent une sauvegarde explicite avant démarrage.

## Remise en service PostgreSQL et migrations locales — 9 novembre 2026

À la demande utilisateur après l'erreur Prisma `Can't reach database server at postgres`, diagnostic du Compose **typing-local** : `app` était actif et `postgres` arrêté avec code de sortie 0. Vérification expurgée depuis l'application : mode `development`, hôte `postgres`, port interne 5432 et base `typing_dev`. Aucune valeur d'identifiant ou de secret affichée.

Actions réellement exécutées sur cette base de développement identifiée : redémarrage du conteneur PostgreSQL **existant** (`docker compose start --wait postgres`), application par le conteneur applicatif de `20261109120000_race_configuration` et `20261109120100_dictionary_words`, régénération Prisma et redémarrage de `app`. Aucun reset, suppression de volume ou changement de secret.

Preuves après intervention :

- `docker compose ps` : application running, PostgreSQL running/healthy.
- `prisma migrate status` depuis `app` : dix migrations, schéma à jour, aucune migration en attente.
- Lecture par le client Prisma régénéré : deux passages `corpus-*`, 426 entrées de dictionnaire FR et 433 EN.
- Requêtes HTTP depuis l'application : `/fr/play`, `/en/play` et `/api/lobbies` répondent **200**, sans erreur Prisma de connexion dans leur réponse.

Les suites lint/types/unitaires/intégration/build/E2E du lot précédent ne sont pas relancées pour cette intervention d'exploitation : aucun code applicatif modifié. Les vérifications ci-dessus portent sur le vrai service de développement réparé ; aucun test ne réinitialise cette base. Procédure de reprise ajoutée à DEVELOPPEMENT-LOCAL.md.

## Réglages derrière un engrenage — 9 novembre 2026

Décision utilisateur : retirer le panneau volumineux du salon et ouvrir une page dédiée. Le formulaire et le résumé complet vivent à `/[locale]/play/room/settings`. L'engrenage possède un nom accessible, un lien explicite retourne à la salle, et Démarrer reste au salon. Le même hook maintient lecture autorisée, SSE et heartbeat ; aucun nouveau schéma ni migration.

### Passé

- Tests ajoutés exécutés rouges avant modification : le formulaire apparaissait encore au salon, la page dédiée ne séparait pas les contrôles et la nouvelle route conservait la navigation générale. Après changement : régressions FR/EN sur rendu principal/configuration, édition hôte et consultation invitée, navigation locale sans barre générale.
- Lint, TypeScript et `check:boundaries` : PASS.
- Suite unitaire complète : **173 tests, 42 fichiers PASS**.
- Suite intégration PostgreSQL jetable : **52 tests, 18 fichiers PASS**, avec les dix migrations puis deuxième déploiement sans migration en attente.
- Build production : PASS, route dynamique `/[locale]/play/room/settings` générée. Documentation de la version Next.js installée consultée pour pages, headers et composants clients.

### Vérification navigateur et correction des attentes historiques

Le premier passage de `race.spec.ts` et `lobby-acceptance.spec.ts` a validé sept scénarios : trois parcours de salle, les deux parcours bonus et les deux nouveaux parcours configuration FR/EN. Ces derniers vérifient l'engrenage, l'absence de formulaire dans le salon, retour à la salle, sauvegarde et partage avec spectateur, absence de navigation générale, reload, page verrouillée en course, mobile 360 px et desktop 1280 px, thèmes clair/sombre et axe sans violation. Le cas FR reste plus de 30 secondes dans l'éditeur et conserve la même salle grâce au heartbeat.

Deux scénarios historiques « two humans race… » échouaient seulement sur l'ancien texte d'attente du panneau retiré après Replay. L'attente cible maintenant l'état serveur `WAITING` et l'engrenage accessible, puis poursuit la vraie deuxième course. Relance ciblée sur la même version : **2/2 PASS** en 34,1 secondes. Au total **neuf scénarios E2E validés** pour ce changement (sept dans le premier passage, puis les deux scénarios corrigés).

### Non exécuté / limites

Pas de déploiement, OAuth réel ou test de charge. Aucun changement métier ou de DB de développement dans ce lot ; les opérations des tests utilisent uniquement PostgreSQL jetable. Commandes locales sous Node 25.6.0 (le projet prévoit Node 24), Chrome installé et port 3109 pour isoler l'application de développement existante. Les réglages non enregistrés ne sont pas conservés lorsqu'on quitte l'éditeur.

## Frappe directe et boîtes personnelles — 9 novembre 2026

Nouvelle décision utilisateur : retirer la zone de frappe visible, donner des boîtes indépendantes à chaque coureur et pondérer les effets par sa place. Confirmation explicite : raccourcir le texte restant pour remonter vers le milieu sans modifier les statistiques. Le contrat actuel et l'écart à BONUS-01 du PDF sont documentés en fin d'ARCHITECTURE.md et dans EXIGENCES.md. Les anciennes courses sans version restent v1 ; les nouveaux départs utilisent v2.

### Passé

- Rouge avant implémentation : trois tests métier exposaient la distribution commune, l'absence de puissance pour le deuxième et l'absence de remontée du dixième ; un E2E mesurait encore un champ opaque séparé. Ces défauts sont maintenant couverts par les régressions.
- Lint, TypeScript, frontières et build production : PASS.
- Suite unitaire : **178 tests, 43 fichiers PASS**. Boîtes personnelles et idempotence après sérialisation, trois seuils individuels, pool léger en deuxième place, remontée contrôlée 10e vers 5e, conservation des vrais progrès/frappes/MPM et du mot à finir, refus d'une remontée devenue inutile en deuxième place, petite attaque permettant à un deuxième proche de challenger le meneur ; tests v1 conservés explicitement pour la compatibilité des courses lancées.
- Suite intégration PostgreSQL jetable : **52 tests, 18 fichiers PASS**. Le meneur franchit son checkpoint sans donner de boîte à l'autre joueur ; ce dernier frappe lui-même jusqu'à son seuil, recharge l'objet réellement persisté, activation concurrente/idempotente, autorisations et révision du texte gardées. Les dix migrations sont réappliquées depuis zéro uniquement dans le harnais jetable.

- E2E finaux : `race.spec.ts` et `lobby-acceptance.spec.ts`, **10/10 PASS en 2,3 min** sur Chrome, build production et PostgreSQL jetable. Boîtes collectées indépendamment et marquées par couloir, inventaire privé/reload/activation réelle, annonces, passage révisé, course/replay/abandon et configuration FR/EN, axe et thèmes/mobile. Le nouveau scénario clique le passage, vérifie la capture transparente au focus et tape au clavier ; le serveur acquitte le vrai brouillon. Aucun champ opaque séparé n'est rendu.

### Non exécuté / limites

Aucune migration SQL supplémentaire requise, aucun déploiement ni réécriture d'une course déjà lancée. Pas de certification de charge à 30 joueurs ni d'équilibrage statistique exhaustif des pools. La remontée vise le milieu et respecte les frontières de mots ; le scénario 10e→5e ne promet pas ce rang dans chaque configuration. En première/deuxième place, une remontée stockée est refusée sans consommation. Le nouveau champ de capture reste natif et accessible, mais transparent : seul le passage et son curseur sont visibles. Vérifications locales sous Node 25.6.0, moteur attendu Node 24 non certifié par ce poste.

## Course réelle à dix participants — 9 novembre 2026

Demande utilisateur : tester dix coureurs, avec bots si nécessaire, prouver l'indépendance des boîtes et une remontée effective du dernier vers la cinquième place. Nouveau scénario reproductible : `tests/e2e/ten-racer-boxes.spec.ts`.

### Passé

Commande réellement exécutée :

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
PLAYWRIGHT_BASE_URL=http://localhost:3109 pnpm test:browser ten-racer-boxes.spec.ts
```

**1/1 E2E PASS en 2,1 min**, sur le build production courant, Chromium/Chrome et PostgreSQL jetable créé par le harnais. Aucun changement de code applicatif requis.

- Création officielle d'un compte de test et de sa salle ; configuration/départ par les vraies commandes HTTP. **Un humain au clavier et neuf bots autonomes**, niveaux 5/5/4/4/3/3/3/3/3, 100 mots anglais, correction libre et bonus actifs.
- Les neuf bots atteignent naturellement leur première boîte pendant que l'humain reste à zéro : aucun objet et aucun checkpoint ne sont accordés à l'humain par leur progression.
- L'humain tape lui-même le premier quart du texte dans le navigateur ; les dix premières boîtes sont reçues par dix identités distinctes, avec propriétaire et cible correspondants. L'inventaire humain ne contient que ses propres objets. Le rechargement conserve sa boîte de remontée.
- Activation réelle du bouton de remontée : **10e → 5e**, texte cible total **100 → 57 mots**. Le nombre de frappes correctes reste **111** ; brouillon, progression, total de frappes et erreurs restent identiques avant/après. Les métriques recalculées à durée égale restent identiques. La personne reste en frappe et doit terminer les mots restants.
- Le test poursuit ensuite la saisie et attend la fin réelle des neuf bots. **10/10 terminés** ; pour chacun, checkpoints `[25, 50, 75]`, **trois objets reçus et trois événements de réception distincts**, soit **30 attributions personnelles**. Aucun reset de progression ou attribution d'objet n'est utilisé pour obtenir ces résultats.
- Lint, TypeScript et `check:boundaries` : PASS avec le nouveau test. Le build applicatif validé au lot précédent est réutilisé ; seules cette recette et ses preuves sont ajoutées.

[Capture réelle de la remontée en cinquième place](images/ten-racer-catchup.png).

### Conditions et limites

Le tirage de l'objet est rendu reproductible en fixant **uniquement la seed** (`ten-racer-replay-5` dans ce passage) dans la base jetable pendant le décompte, avant toute frappe ou progression. Le test choisit une seed qui couvre le tirage de remontée et ne fabrique ni inventaire, ni progression, ni métriques, ni horodatage en course. Le texte, les identités et la simulation des bots restent réels ; les délais observés et le nombre exact de mots retirés peuvent varier sur une autre exécution. Ce test démontre l'effet d'une remontée effectivement obtenue, pas que chaque boîte du dernier contient toujours cet objet.

La fixture refuse toute cible autre que `127.0.0.1/localhost:55432/typing_test`. Aucune base de développement ou de production modifiée. Il s'agit de dix participants serveur avec un navigateur humain ; ce n'est pas une mesure de charge de dix navigateurs ni de trente joueurs, et aucune preuve OAuth/déploiement n'en découle.

## Effets visuels des sept bonus — 9 novembre 2026

Présentation lobby uniquement, pour BONUS-03, DES-05/06 et accessibilité. Les événements serveur confirment les impacts, les destinataires reçoivent leur effet, les expéditeurs d'attaque une confirmation et les autres membres un impact sur le couloir ciblé. Pas de changement de règles, scores, DB ou transport.

### Passé

- Huit tests dédiés au sélecteur et au rendu : destinataire/expéditeur/observateur, sept effets distincts, refus des réceptions/événements futurs/anciens/doublons, événement bloqué traduit en impact de bouclier, fin du brouillard et absence de rejeu ancien après reload, suppression immédiate d'une ancienne impulsion de brouillard/bouclier devenue fausse.
- Suite unitaire complète : **186 tests, 44 fichiers PASS**. Lint, TypeScript et frontières : PASS.
- Intégration PostgreSQL jetable : **52 tests, 18 fichiers PASS**, migrations depuis zéro puis deuxième déploiement sans attente.
- Build production avec les effets CSS : PASS. Nouvelle dépendance : aucune ; les effets utilisent les propriétés CSS transform/opacity et une liste bornée de particules.
- Après l'ajustement de suppression des impulsions périmées : build final, 186 unitaires, lint/types/frontières PASS ; les deux scénarios visuels FR/EN sont rejoués et passent **2/2 en 28,5 s**. Captures inspectées : [brouillard sombre](images/bonus-fog-fr.png) et [remontée claire](images/bonus-catchup-fr.png).
- `race-feedback.spec.ts`, `race.spec.ts`, `ten-racer-boxes.spec.ts` : **10/10 E2E PASS en 4,6 min** sur Chrome/port 3109 et PostgreSQL jetable. Les sept activations passent en FR/EN ; attaque bloquée, bordures persistantes, bouclier après rechargement, expiration, absence d'effet plein écran chez l'observateur, impact de piste, capture clavier à travers la couche décorative, mobile sans débordement, thème sombre/clair et mouvement réduit sont vérifiés.
- Le scénario réel à dix participants passe aussi avec les effets actifs : un humain/neuf bots, trente boîtes personnelles, tous terminés et remontée effective. Ce passage a produit 10e→6e avec un texte cible de 100→48 mots ; les frontières de mots et positions courantes expliquent la variation, conformément au contrat de rapprochement vers le milieu. La preuve précédente 10e→5e reste une exécution distincte documentée plus haut.

### Échecs intermédiaires et limites

Le test navigateur a d'abord été exécuté contre le build précédent : aucun visuel de brouillard n'était trouvé, comme attendu. Les tests de rendu échouaient sans les nouveaux composants ; un test supplémentaire reproduisait le maintien d'une ancienne impulsion après dissipation/consommation, puis passe après suppression conditionnée par l'état serveur.

Un rejeu a aussi détecté une fixture trop rapide : 60 % du texte préparé avec seulement cinq secondes écoulées déclenchait la limite serveur de 30 frappes/s pendant la vérification clavier. L'horodatage de la fixture est corrigé à trente secondes ; les règles applicatives restent intactes et la frappe est ensuite confirmée en DB dans les deux langues.

La recette des sept effets prépare dans la seule DB jetable les objets et positions utiles pour couvrir toutes les variantes, puis utilise leurs vraies commandes d'activation et les snapshots SSE. Elle vérifie la présentation et les autorisations habituelles, sans prétendre que ces sept objets ont tous été tirés naturellement dans une même course. La course à dix est le scénario séparé avec vrai clavier et bots autonomes.

Aucun test de charge à trente clients, déploiement, connexion OAuth réelle ou nouvelle migration. Les commandes locales utilisent Node 25.6.0 ; Node 24 attendu par le projet n'est pas certifié par ce poste. En mouvement réduit, bordures et notifications demeurent statiques, particules/mouvements supprimés. Les effets sont décoratifs et le journal traduit existant reste la source des annonces accessibles.


## Course stable et bonus automatiques — 9 novembre 2026

Demande utilisateur : retirer le panneau « Boîtes mystères » qui déplace la saisie, conserver les surfaces de course stables et appliquer les bonus au ramassage. Module propriétaire : lobby, domaine pour l’activation atomique et présentation pour les surfaces. Aucun changement de transport ni migration SQL.

### Preuves intermédiaires

- Deux nouveaux tests de ramassage ont d’abord échoué (`usedAt: null`), puis passent avec application immédiate et exactement une réception/application. Un test supplémentaire vérifie la reprise automatique des objets utiles des agrégats historiques v1. Les tirages simultanés utiles sont couverts sur 80 seeds/dix joueurs.
- Les tests FR/EN du journal ont d’abord échoué sur le titre d’inventaire visible. Ils passent ensuite avec `RaceBonusLog` traduit `sr-only`, sans cartes ni boutons et avec annonces d’application/blocage.
- Les deux E2E de stabilité exécutés contre l’ancien build ont d’abord échoué sur `.race-items` encore présent.
- Premier passage du nouveau build : la course réelle à dix termine avec trente boîtes personnelles automatiquement consommées ; l’humain remonte de 10e à 5e, cible totale 100→54 mots, 113 frappes correctes après la dernière lettre réellement tapée. Le test compare les métriques avant/après avec exactement cette lettre supplémentaire : aucun crédit de frappe n’est produit par le bonus. Focus et dimensions des deux surfaces sont inchangés. [Capture de ce premier passage](images/ten-racer-auto-catchup.png).
- Ce premier passage navigateur a aussi relevé quatre échecs Axe sur la piste défilante non focalisable au clavier. Correction : piste et passage accessibles au clavier, contour de focus visible. Un scénario visuel EN perdait l’icône de remontée lorsqu’une deuxième boîte naturelle était automatiquement ramassée ; sa fixture visuelle réserve désormais les autres seuils et fait défiler le couloir observé, tandis que le scénario réel à dix couvre les ramassages naturels successifs. Le couloir personnel est également épinglé en tête avec son vrai rang pour rester visible lorsque le classement change.

### Conditions et limites

Fixtures visuelles et sélection déterministe de seed restent limitées à PostgreSQL jetable `127.0.0.1/localhost:55432/typing_test`. Les sept effets sont préparés pour leur couverture visuelle, puis activés uniquement par l’avancement serveur ; aucun clic `item` n’est nécessaire. La course à dix utilise un vrai clavier et neuf bots autonomes ; seule sa seed est choisie pendant le décompte. Ce n’est pas une charge de dix navigateurs ou trente clients. Aucun déploiement ni connexion OAuth réelle. Node 25.6.0 utilisé sur ce poste, Node 24 attendu par package.json non certifié ici.


### État final validé

- **189 unitaires / 44 fichiers PASS** sur l’état final, dont les régressions d’activation/reprise et de rendu accessible.
- **52 intégrations / 18 fichiers PASS** sur PostgreSQL jetable ; migrations depuis zéro puis second déploiement sans migration en attente. L’intégration des boîtes vérifie réception/application persistées atomiquement, contrôle de propriété et absence de second effet lors de répétitions concurrentes de l’ancienne commande.
- **Lint, TypeScript, `check:boundaries` et build production PASS**. Aucune dépendance ni migration ajoutée pour cette demande.
- [Capture finale FR sombre de la surface stable](images/stable-race-fr.png) : panneau supprimé, couloir personnel épinglé et focus conservé sur le passage.

- **10/10 E2E PASS en 4,3 min sur le build final**, Chrome local/port 3109 : sept effets automatiques FR/EN, clair/sombre, mouvement réduit, mobile, Axe, décompte sans déplacement, frappe continue sans requête `item`, coordonnées exactes inchangées de la piste, du couloir personnel et de la saisie, rechargement sans double application ; régressions de course/configuration/rejeu également vertes.
- Course finale réelle à dix : **10e→5e automatiquement**, cible totale **100→54 mots**, **110 frappes correctes** après la dernière lettre réellement tapée, sans frappe ajoutée par le bonus. Les **dix coureurs terminent**, chacun avec **trois réceptions et trois consommations uniques au même horodatage**, soit trente boîtes personnelles consommées. Seed `ten-racer-replay-1` choisie pendant le décompte, sans injection de progression/objet en course. [Capture finale avec le couloir personnel en 5e place épinglé](images/ten-racer-auto-catchup-final.png).


## Tous les coureurs visibles et texte compact — 9 novembre 2026

La demande utilisateur remplace la piste défilante précédente : tous les coureurs sont visibles simultanément, avec une fenêtre de frappe plus petite et fixe, dont le contenu suit la position courante. Présentation du module lobby uniquement (`race-track.tsx`, `race.css`, `race-passage.tsx`), sans modification du moteur, des bonus automatiques, des métriques, des contrats ou de la DB.

### Vérifications réalisées

- Nouveau `tests/e2e/race-track-layout.spec.ts` : deux vrais comptes/salles isolés, un humain et neuf ou vingt-neuf bots configurés par les commandes HTTP autorisées, 100 mots aléatoires, bonus désactivés pour isoler la géométrie. Aucun état de course ou texte injecté en DB.
- RED sur le build précédent : les deux scénarios échouent sur le débordement de la piste (`scrollHeight > clientHeight`). Premier ajustement : tous visibles à 1280×720, mais personnages trop petits à 900×600 ; les libellés/marges/aide sont compactés. Le cas trente sur mobile révèle ensuite la nécessité de trois colonnes ; l’en-tête mobile reçoit également sa propre hauteur pour éviter de chevaucher la piste. Les tests conservent les assertions de taille et de visibilité.
- La recette vérifie dix/trente couloirs et personnages contenus dans la piste et la fenêtre, sans défilement horizontal/vertical, à 1280×720, 900×600 et 360×780 ; petite surface de texte (au plus 145 px au bureau), 250 caractères réellement tapés, rectangle de frappe inchangé, focus conservé, défilement interne positif, curseur visible à la frappe et après redimensionnement, et Axe WCAG 2 A/AA. FR/sombre, EN/clair/mouvement réduit sont couverts. Le conseil de clavier physique est conservé sur mobile.
- **189 unitaires / 44 fichiers PASS**, **52 intégrations / 18 fichiers PASS**, **lint, TypeScript, frontières et build production final PASS**. Intégrations sur PostgreSQL jetable, migrations depuis zéro puis second déploiement sans attente. Aucune nouvelle dépendance ou migration pour cette demande.

### Limites

Trente participants serveur et un navigateur permettent de vérifier cette présentation ; ce n’est pas un test de charge de trente navigateurs. Aucun déploiement, connexion OAuth réelle ou base de développement/production modifiée. Les MPM/statuts des cartes denses restent accessibles aux lecteurs d’écran ; les noms longs sont tronqués visuellement avec leur intitulé complet. Node 25.6.0 utilisé sur ce poste, Node 24 requis par le projet non certifié ici.


Les deux nouvelles recettes passent sur le build final : affichage intégral de dix et trente coureurs aux trois dimensions, sans chevauchement de l’en-tête, suivi du curseur après 250 caractères et redimensionnement, Axe sans violation. Captures inspectées : [10 coureurs FR/sombre](images/all-10-racers.png), [30 coureurs EN/clair](images/all-30-racers.png), [30 coureurs sur mobile](images/all-30-racers-mobile.png).


**12/12 E2E PASS en 5,3 min sur le build final** : `race-track-layout.spec.ts`, `race.spec.ts`, `race-feedback.spec.ts` et `ten-racer-boxes.spec.ts`. Les sept effets, l’activation automatique, la stabilité de la piste/du couloir personnel/de la saisie, l’accessibilité, la reprise, les résultats et la configuration restent verts. La course réelle à un humain/neuf bots termine les dix coureurs, chacun avec trois boîtes personnelles reçues/consommées une seule fois ; nouvelle remontée automatique **10e→5e**, cible totale **100→60 mots**, **113 frappes correctes** après la dernière lettre réellement tapée. [Capture de la grille compacte avec cette remontée](images/compact-ten-racer-catchup.png).


## Dropdown partagé — 9 novembre 2026

Demande utilisateur : un menu déroulant commun utilisé dans toute l’application. Le propriétaire est shared/presentation, avec données traduites et règles conservées dans les présentations métier. `Dropdown` remplace `Select` et les listes natives du mode de texte et du niveau des bots. Huit usages déclaratifs couvrent rôles, visibilités, langue de texte, mode, complexité, correction et niveaux individuels.

### Contrôles réalisés

- Recherche dans `src` : aucun `<select>`, `<option>`, import `ui/select`, ancien `<Select>` ou classe `playful-select` restant. Un seul propriétaire des rôles combobox/listbox/option : `shared/presentation/ui/dropdown.tsx`.
- Nouveau test de configuration FR/EN : contrôles partagés, annulation par clic extérieur après survol, Échap, validation clavier, conservation du focus, changement immédiat des filtres selon le mode, niveau de bot contrôlé, sauvegarde réelle et rechargement, menu dans la fenêtre à 360 px, Axe WCAG 2 A/AA. Le test EN a d’abord échoué sur `SELECT` au lieu de `BUTTON` contre l’ancien build. La première fixture FR ne patientait pas suffisamment pour charger le formulaire ; l’attente explicite du contrôle est ajoutée avant l’inventaire des combobox.
- Tests existants de mode/niveau de bot adaptés aux interactions DOM du composant commun. Les tests de rôle conservent la recherche par caractères, les raccourcis clavier, Tab, les icônes/chevrons dans les contrôles et la vraie soumission de FormData.
- **189 unitaires / 44 fichiers PASS**, **52 intégrations / 18 fichiers PASS**, **lint, TypeScript, frontières et build production PASS**. PostgreSQL jetable uniquement, migrations depuis zéro et second déploiement sans attente. Aucune nouvelle dépendance ou migration SQL.

### Limites

Recette navigateur Chrome local sur le build de production et base jetable. Les lecteurs d’écran physiques, Safari et appareils tactiles réels ne sont pas certifiés par Axe/Chrome. Aucun déploiement ni connexion OAuth réelle. Node 25.6.0 utilisé sur ce poste, Node 24 attendu par le projet non certifié ici. Les courses à dix/trente ont été validées au lot précédent ; les changements actuels concernent les menus et les parcours de réglages, pas les règles de course.


**Résultat final : 21 scénarios E2E distincts validés sur le même build applicatif.** Le passage groupé `play-join.spec.ts race.spec.ts select.spec.ts` donne 19 PASS en 2,2 min ; les deux nouveaux tests s’arrêtent alors sur un sélecteur de titre ambigu (h1 et h2 identiques). Après précision du niveau du titre dans les seuls tests, `select.spec.ts` repasse **8/8 en 9,1 s**, dont les deux cas contrôlés FR/EN. Les treize scénarios adhésion/course du passage groupé et les huit scénarios dropdown sont tous verts. Aucune correction applicative nécessaire après ce build. [Capture FR sombre](images/shared-dropdown-fr.png), [capture EN claire](images/shared-dropdown-en.png).

## Métriques du profil — 9 novembre 2026

État local : lint, typecheck, check:boundaries PASS ; 189 tests unitaires PASS ; 53 tests d'intégration PASS sur PostgreSQL jetable, migration et replay inclus. Nouveau test profile-metrics : agrégats connus, victoire FINISHED/rang 1, anciens rangs inconnus, isolement par identité. Premier essai PostgreSQL bloqué par mémoire partagée système ; relance autorisée réussie. Compilation lancée avec cache SWC temporaire après refus d'accès au cache utilisateur. E2E du profil non exécutés à ce stade. Limites : 100 derniers résultats visibles, 30 points au graphique, anciennes victoires non reconstructibles. Aucune migration de base inconnue ou production.

Résultats finaux : build de production PASS après relance avec accès au cache SWC ; 3 E2E profil PASS avec Chrome installé, serveur local port 3107 et PostgreSQL jetable. Les tentatives initiales E2E ont rencontré le port 3000 occupé puis le navigateur Playwright absent ; ces blocages ont été contournés sans modifier le serveur existant. La recette navigateur couvre édition/photo/session, états vides, FR/EN, clair/sombre et largeurs 360/820/1440 avec axe. Les agrégats non vides sont vérifiés en intégration ; le graphique et la pagination avec résultats ne disposent pas encore d'une recette navigateur dédiée.


### Compléments du profil — 10 novembre 2026

AUTH-06 / HIST-02 : le profil propose aux invités la création de compte. La présentation lobby ouvre les détails personnels persistés dans chaque ligne : MPM brut, erreurs, durée, en FR/EN, sans nouvelle requête ni nouvel accès intermodule. Identité, photo, édition, cinq métriques et graphique restent présents. HIST-02 reste partiel : ces détails personnels ne constituent pas la page complète des résultats multijoueurs et graphiques. La limite de 100 courses et les anciens rangs inconnus restent explicites. Vérifications : 6 tests ciblés profil/historique, types et frontières ; lint ciblé. Build, intégration et E2E non exécutés pour cette modification de présentation.


### Invités → inscription locale — 10 novembre 2026

PASS : 195 unitaires avant ajout du test de garde de formulaire, puis 9 tests auth-page dont ce nouveau test ; 54 intégrations sur PostgreSQL jetable ; nouvelle exécution ciblée du parcours et du contrôle d’ancienne session PASS ; lint global puis ciblé final, typecheck, frontières et build production PASS. E2E production Chrome local sur PostgreSQL jetable : 1/1 scénario course invitée → inscription par formulaire → profil/historique → déconnexion attendue → nouvelle connexion → historique conservé. Première exécution sans navigateur disponible, puis échec révélant la garde d’inscription invitée, corrigée ; une course entre navigation et déconnexion dans le test corrigée par attente de l’URL. OAuth et suite E2E complète non exécutés.

Limites : nouvelles courses humaines persistées seulement ; les courses invitées anciennes déjà supprimées ne sont pas récupérables. Transfert réservé à l’inscription email depuis la session invitée officielle ; aucune fusion avec un compte existant. Le formulaire invité d’inscription reste accessible sans logout ; lien d’inscription ajouté à la navigation des invités. Aucune migration, aucun reset ou déploiement de base nécessaire pour ce changement.


### Résultats complets et podium — 10 novembre 2026

PASS : 196 unitaires puis test podium ciblé additionnel (ordre 3/2/1, délai vainqueur, quatrième concurrent présent au tableau) ; 54 intégrations sur PostgreSQL jetable, avec accès archive, refus d’un tiers et conservation après reset ; lint, types, frontières et build. E2E Chrome production 1/1 : invité → inscription → historique → résultats complets deux concurrents → ordre podium → animations réduites → largeur mobile 390 px sans débordement de page → reconnexion. Capture mobile /tmp/race-archive-mobile.png inspectée. Le tableau défile horizontalement sur mobile. Migration appliquée au Docker local typing_dev identifié, sans reset, application redémarrée. Suite E2E globale et contrôle OAuth non exécutés ; archives historiques absentes non reconstituées.


### Onde de choc à la place du bouclier — 10 novembre 2026

PASS : 199 unitaires ; 19 tests bonus ciblés après renforcement du cas multi-cibles (devant / derrière / terminé / rejeu) ; 54 intégrations PostgreSQL jetable ; lint, types, frontières et build. E2E Chrome production FR/EN : 2/2 coffres automatiques, piste et focus stables. Les anciens tests de tirage attendaient le bouclier et ont été adaptés au nouveau pouvoir ; le test du dernier mot isole désormais le raccourci des attaques automatiques adverses. Compatibilité de lecture des anciens boucliers maintenue ; aucun nouveau tirage shield. Suite E2E globale non exécutée.


### Célébration dramatique — 10 novembre 2026

PASS : 4 tests ciblés podium/historique (incluant absence de fausse victoire après abandon), lint global et ciblé, types, frontières, build. Chrome production sur PostgreSQL jetable : 1/1 course effectivement terminée par frappe, annonce de victoire, 36 confettis, résultats visibles, confettis masqués et tremblement supprimé en reduced-motion. Capture /tmp/dramatic-podium.png inspectée. Suite intégration et E2E globale non réexécutées pour cette modification de présentation.


### Centrage et projecteur — 10 novembre 2026

PASS : deux tests podium ciblés, lint global puis ciblé final, types, frontières et build. E2E Chrome production sur PostgreSQL jetable 1/1 : victoire réelle, centre de la marche du gagnant à moins de 2 px du centre de la scène, voile disparu après la séquence et voile/confettis masqués en animations réduites. Capture finale /tmp/dramatic-podium.png inspectée. Intégration et suite E2E globale non réexécutées pour cette modification de présentation.


### Audio et pauses du podium — 10 novembre 2026

PASS : 4 tests ciblés timing/podium, types, frontières, lint global et build. Chrome production sur PostgreSQL jetable 1/1 : victoire réelle, programmation d'oscillateurs sur AudioContext natif en état running, bouton mute/unmute et aria-pressed, centrage et mode reduced-motion. Ce contrôle vérifie la programmation audio native, pas une écoute humaine de la fanfare. Suite intégration et E2E globale non réexécutées (présentation uniquement). Son synthétisé original, aucune ressource externe ; autoplay soumis à la politique du navigateur.


### Faux stade et célébration excessive — 10 novembre 2026

PASS : 4 tests ciblés podium/timing, types, frontières, lint global puis ciblé final et build. E2E Chrome production sur PostgreSQL jetable 1/1 : victoire réelle, plus de 60 sources audio natives programmées pour applaudissements/foule, oscillateurs, mute/unmute, 96 confettis, centrage et reduced-motion. Pas d'écoute humaine certifiée ; sons de foule et clameurs synthétiques. Suite intégration et E2E globale non réexécutées pour cette modification de présentation.


### Enregistrements réels et confettis continus — 10 novembre 2026

PASS : 4 tests ciblés podium/timing, types, frontières, lint et build. Chrome production sur PostgreSQL jetable 1/1 : deux fichiers audio locaux décodés et sources natives programmées, mute/unmute, confettis animation-iteration-count infinite, puis masqués en reduced-motion. Sources téléchargées et vérifiées : WAV PCM 44,1 kHz stéréo Kevin MacLeod / CC BY 3.0 ; Vorbis 44,1 kHz mono Starlite / domaine public. Crédits et licence exposés dans public/audio/credits.txt via lien traduit. Pas d'écoute humaine certifiée. Suites intégration et E2E globale non réexécutées pour cette modification de présentation.


### Consultation sans podium — 10 novembre 2026

PASS : 3 tests ciblés podium, types, frontières, lint ciblé et build. Chrome production sur PostgreSQL jetable 1/1 : historique → résultats sans podium, projecteur ni bouton son ; tableau sans animation ; mobile et historique après reconnexion. La cérémonie de fin de course reste couverte par les tests podium existants. Suites intégration et E2E globale non réexécutées pour ce changement de présentation.


### Vérification avant push — 10 novembre 2026

État final : 203 unitaires et 54 intégrations PostgreSQL jetable PASS ; lint global, typecheck, frontières et git diff --check PASS. Dernier build et scénario Chrome historique sans podium PASS au changement précédent, sans modification de code source depuis. Suite E2E globale non réexécutée ; preuves ciblées et limites conservées ci-dessus.
