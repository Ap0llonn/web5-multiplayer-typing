# Jeu de frappe multijoueur

Next.js App Router, TypeScript strict, Tailwind, Better Auth, PostgreSQL/Prisma. Monolithe modulaire inspiré de Type : lire [architecture](docs/ARCHITECTURE.md) et [exigences](docs/EXIGENCES.md) avant toute modification.

Le titre ci-dessus est une description fonctionnelle, pas le nom de marque. Le nom et le logo définitifs doivent être créés par l'étudiant sans IA.

## Démarrage

Node 24.19.0 et pnpm 11.19.0. Docker Engine/Desktop avec Compose v2 fournit PostgreSQL 18.4, Redis, un stockage S3 local pour les futures images et Next.js avec rechargement à chaud. [Guide de développement local et Dokploy](docs/DEVELOPPEMENT-LOCAL.md). Les scripts sont en TypeScript.

```sh
pnpm install --frozen-lockfile
cp -n .env.example .env  # Ne pas écraser un fichier existant
# Définir BETTER_AUTH_SECRET dans .env : openssl rand -base64 32
# Les autres valeurs fournies sont des exemples réservés au développement.
pnpm infra:up
# Vérifier que DATABASE_URL pointe bien vers PostgreSQL local.
pnpm exec prisma migrate deploy
```

Pour arrêter les services sans effacer les données : `pnpm infra:down`. PostgreSQL possède identités, profils, salles et courses. Les photos de profil validées et redimensionnées sont stockées dans PostgreSQL ; Redis et S3 restent provisionnés pour de futurs usages.

`pnpm dev` et `pnpm build` génèrent automatiquement le client Prisma avant Next.js. Les migrations et la génération sont distinctes : `prisma migrate deploy` ne crée pas `src/generated/prisma/client.ts`. Pour les commandes de types, tests ou seed lancées seules, conserver `pnpm db:generate` comme préparation explicite.

Ouvrir http://localhost:3000. Langue du navigateur FR/EN, repli FR ; choix explicite conservé par cookie. Thème système initial puis choix clair/sombre conservé localement. Les parcours existants et la course humaine ont une recette locale Chromium, clavier, mobile et axe ; voir [les preuves et limites exactes](docs/verification.md). Une recette locale ne certifie pas le VPS, les callbacks OAuth externes ou une charge à 30 participants.

## Authentification

Comptes locaux : email obligatoire à l'inscription, identifiant/mot de passe à la connexion, longueur mot de passe12–128. Pas de récupération de mot de passe ni service email. Invité : pseudo3–20, vraie session Better Auth, création de salle interdite. Session7jours, renouvellement quotidien ; chaque action revérifie la session, sans cache cookie. Suppression/liaison invité automatiques désactivées. Pas de conversion transparente, quitter explicitement la session avant inscription/login. Cookies supprimés/expirés : aucune garantie de récupération de l'identité invitée.

GitHub ET Discord sont requis pour la remise. Chaque paire CLIENT_ID/CLIENT_SECRET doit être complète ; sinon fournisseur indisponible ou erreur déterministe si paire partielle. Callbacks : BETTER_AUTH_URL/api/auth/callback/github et /discord. Configurer les credentials via un canal sécurisé, jamais Git ou conversation. Leurs callbacks réels ne sont pas validés par les tests de comptes locaux.

## Salons

Compte : créer avec nom, capacité2–30, visibilité publique/sur code et rôle participant/spectateur. Invité ou compte : rejoindre avec code6caractères. L'annuaire public et la partie rapide ouvrent le même vrai parcours d'entrée. Invitations privées et filtres avancés restent futurs. Une seule salle active par joueur, contrainte DB ; rechargement/onglets de la même identité ne doublent pas le siège. Présence via SSE autorisé. Reconnexion≤30secondes conserve le siège ; départ explicite transfère l'hôte au compte actif arrivé le plus tôt, sinon ferme la salle.

## Course humaine

Après la migration `20261108140000_human_race`, ouvrir une salle et rejoindre depuis une deuxième session navigateur, éventuellement invitée. L'hôte enregistre langue FR/EN, nombre de mots, correction obligatoire/libre et temps maximal, puis démarre avec au moins deux participants. Le texte apparaît au décompte 3–2–1. La frappe affiche erreurs, curseur, MPM et précision ; la piste synchronisée inclut les spectateurs sans zone de frappe. Les petits écrans affichent un conseil de clavier physique.

Le serveur calcule progression, métriques, classement et délai depuis les lots de frappes et son horloge. Reload/reconnexion retrouve le dernier brouillon acquitté. Abandonner ou quitter demande confirmation pendant la course. Les résultats affichent podium/tableau ; l'hôte prépare la prochaine course ou ferme la salle. Les résultats des comptes et séries MPM sont persistés ; les invités restent limités à la course courante. Bots, bonus, configuration avancée, graphiques, statistiques de profil et historique complet restent futurs. [Contrat et limites](docs/ARCHITECTURE.md#course-humaine--demande-utilisateur-du-8-novembre-2026).

## Vérification

```sh
pnpm infra:validate    # validation réelle de la configuration par Docker Compose
pnpm test:compose      # services jetables distincts, image S3 et persistance
pnpm db:validate
pnpm db:generate
pnpm exec next typegen
pnpm lint
pnpm typecheck
pnpm check:boundaries
pnpm test:unit
pnpm test:integration  # crée PostgreSQL jetable, migre deux fois, teste, détruit
pnpm build
pnpm test:http         # vrai build de production + PostgreSQL jetable + HTTP/SSE
pnpm exec playwright install --with-deps chromium
pnpm test:browser      # mêmes services jetables + Playwright
```

Le harnais DB embarqué est limité à localhost et une base typing_test. Il utilise un dossier temporaire et ne touche pas une DB externe. `pnpm db:test:up` / `pnpm db:test:down` sont fournis pour une machine locale normale, dans deux terminaux ; le premier reste actif et crée .env.test ignoré par Git. `db:migrate:test` refuse une URL distante ou un nom qui ne termine pas par _test. En CI, PostgreSQL est un service jetable dédié. Ne jamais lancer un reset sur la production.

## Déploiement et limites

Le dépôt fournit `Dockerfile` et `compose.production.yaml` pour lancer l’application sous Dokploy avec PostgreSQL externe ; aucun VPS, compte ou secret de production n'a été créé par ce commit. Le modèle des variables de production est [.env.production.example](.env.production.example). L’image de production applique les migrations versionnées au démarrage avec `prisma migrate deploy`, puis lance Next.js seulement en cas de succès ; le build génère uniquement le client Prisma. Vérifier la base cible avant de déployer et configurer le domaine HTTPS/callbacks OAuth dans Dokploy. La production réelle et les callbacks ne sont pas démontrés par la présence de ces fichiers. L’exemple [reverse proxy](deploy/nginx.conf.example) reste utile pour un VPS géré manuellement : il DOIT écraser X-Forwarded-For, désactiver buffering SSE, limiter corps et isoler port3000. Faire le test réel depuis deux sessions séparées avant validation de la remise.

[Preuves et limites](docs/verification.md) · [Checkpoint](docs/CHECKPOINT_1.md) · [ADR](docs/adr/0001-data-realtime.md)
