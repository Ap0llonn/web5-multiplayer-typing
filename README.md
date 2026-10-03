# Jeu de frappe multijoueur — socle Sprint 1

Next.js App Router, TypeScript strict, Tailwind, Better Auth, PostgreSQL/Prisma. Monolithe modulaire inspiré de Type : lire [architecture](docs/ARCHITECTURE.md) et [exigences](docs/EXIGENCES.md) avant toute modification.

Le titre ci-dessus est une description fonctionnelle, pas le nom de marque. Le nom et le logo définitifs doivent être créés par l'étudiant sans IA.

## Démarrage

Node24.19.0 et pnpm11.19.0, PostgreSQL18.4 (ou version supportée par Prisma). Les scripts sont en TypeScript.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Remplir DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL.
# Secret de développement : openssl rand -base64 32
pnpm db:generate
pnpm exec prisma migrate deploy
pnpm dev
```

Ouvrir http://localhost:3000. Langue du navigateur FR/EN, repli FR ; choix explicite conservé par cookie. Thème système initial puis choix clair/sombre conservé localement. UI volontairement minimale, utilisable au clavier et cible 360px, mais preuve navigateur encore requise dans CI.

## Authentification

Comptes locaux : email obligatoire à l'inscription, identifiant/mot de passe à la connexion, longueur mot de passe12–128. Pas de récupération de mot de passe ni service email. Invité : pseudo3–20, vraie session Better Auth, création de salle interdite. Session7jours, renouvellement quotidien ; chaque action revérifie la session, sans cache cookie. Suppression/liaison invité automatiques désactivées. Pas de conversion transparente, quitter explicitement la session avant inscription/login. Cookies supprimés/expirés : aucune garantie de récupération de l'identité invitée.

GitHub ET Discord sont requis pour la remise. Chaque paire CLIENT_ID/CLIENT_SECRET doit être complète ; sinon fournisseur indisponible ou erreur déterministe si paire partielle. Callbacks : BETTER_AUTH_URL/api/auth/callback/github et /discord. Configurer les credentials via un canal sécurisé, jamais Git ou conversation. Leurs callbacks réels ne sont pas validés par les tests de comptes locaux.

## Salons

Compte : créer avec nom, capacité2–30 et rôle participant/spectateur. Invité ou compte : rejoindre avec code6caractères. S1 implémente « Sur code » ; annuaire public et invitations privées sont futurs. Une seule salle active par joueur, contrainte DB ; rechargement/onglets de la même identité ne doublent pas le siège. Liste présente via SSE autorisé. Reconnexion≤30secondes conserve le siège ; départ explicite transfère l'hôte au compte actif arrivé le plus tôt, sinon ferme la salle. Course, bots, bonus, photos, stats et historique restent futurs.

## Vérification

```sh
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

VPS public HTTPS obligatoire ; aucun VPS, compte ou secret de production n'a été créé par ce commit. Sur le VPS approuvé : installer Node, fournir variables, appliquer migrations, build, exécuter `pnpm start` derrière Nginx. Exemple [reverse proxy](deploy/nginx.conf.example) à adapter, DOIT écraser X-Forwarded-For, désactiver buffering SSE, limiter corps et isoler port3000. Les callbacks OAuth doivent correspondre exactement au domaine HTTPS. Faire le test réel depuis deux sessions séparées avant validation de la remise. Ne pas exposer directement Next derrière un proxy qui conserve un X-Forwarded-For fourni par le client.

[Preuves et limites](docs/verification.md) · [Checkpoint](docs/CHECKPOINT_1.md) · [ADR](docs/adr/0001-data-realtime.md)
