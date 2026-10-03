# Jeu de frappe multijoueur — socle Sprint 1

Next.js App Router, TypeScript strict, Tailwind, Better Auth, PostgreSQL/Prisma. Monolithe modulaire inspiré de Type : lire [architecture](docs/ARCHITECTURE.md) et [exigences](docs/EXIGENCES.md) avant toute modification.

Le titre ci-dessus est une description fonctionnelle, pas le nom de marque. Le nom et le logo définitifs doivent être créés par l'étudiant sans IA.

## Démarrage

Node 24.19.0 et pnpm 11.19.0. Docker Engine/Desktop avec Compose v2 fournit PostgreSQL 18.4, Redis et un stockage S3 local pour les futures images. Next.js reste lancé sur la machine avec rechargement à chaud. [Guide de développement local](docs/DEVELOPPEMENT-LOCAL.md). Les scripts sont en TypeScript.

```sh
pnpm install --frozen-lockfile
cp -n .env.example .env  # Ne pas écraser un fichier existant
# Définir BETTER_AUTH_SECRET dans .env : openssl rand -base64 32
# Les autres valeurs fournies sont des exemples réservés au développement.
pnpm infra:up
pnpm db:generate
# Vérifier que DATABASE_URL pointe bien vers PostgreSQL local.
pnpm exec prisma migrate deploy
pnpm dev
```

Pour arrêter les services sans effacer les données : `pnpm infra:down`. PostgreSQL est utilisé par le socle ; Redis et S3 sont provisionnés pour la suite, sans intégration métier ni upload de photo à ce stade.

Ouvrir http://localhost:3000. Langue du navigateur FR/EN, repli FR ; choix explicite conservé par cookie. Thème système initial puis choix clair/sombre conservé localement. UI volontairement minimale : 14 scénarios Chromium passent sur la référence `66787c07`, dont les salons à plusieurs sessions/onglets, la reconnexion de l’hôte et de l’invité, les préférences langue/thème, l’inscription au clavier et les pages/formulaires/salons à 360 px en FR/EN et clair/sombre. Les contrôles axe automatisés passent sur les états parcourus ; la certification WCAG exhaustive et l’absence de flash visuel au premier affichage ne sont pas établies. Voir [les preuves et limites exactes](docs/verification.md).

## Authentification

Comptes locaux : email obligatoire à l'inscription, identifiant/mot de passe à la connexion, longueur mot de passe12–128. Pas de récupération de mot de passe ni service email. Invité : pseudo3–20, vraie session Better Auth, création de salle interdite. Session7jours, renouvellement quotidien ; chaque action revérifie la session, sans cache cookie. Suppression/liaison invité automatiques désactivées. Pas de conversion transparente, quitter explicitement la session avant inscription/login. Cookies supprimés/expirés : aucune garantie de récupération de l'identité invitée.

GitHub ET Discord sont requis pour la remise. Chaque paire CLIENT_ID/CLIENT_SECRET doit être complète ; sinon fournisseur indisponible ou erreur déterministe si paire partielle. Callbacks : BETTER_AUTH_URL/api/auth/callback/github et /discord. Configurer les credentials via un canal sécurisé, jamais Git ou conversation. Leurs callbacks réels ne sont pas validés par les tests de comptes locaux.

## Salons

Compte : créer avec nom, capacité2–30 et rôle participant/spectateur. Invité ou compte : rejoindre avec code6caractères. S1 implémente « Sur code » ; annuaire public et invitations privées sont futurs. Une seule salle active par joueur, contrainte DB ; rechargement/onglets de la même identité ne doublent pas le siège. Liste des présents via SSE autorisé, avec libellés compte/invité, hôte, rôle et présence. Le heartbeat du navigateur renouvelle sa propre adhésion ; les lectures SSE ne maintiennent pas artificiellement une personne en ligne. La reconnexion de l’hôte et de l’invité dans la grâce de 30 secondes conserve les identités et le siège. Un onglet périmé retrouve sa salle actuelle et demande un départ explicite avant de rejoindre une autre salle ; aucun changement de salle automatique. Le départ explicite transfère l’hôte au compte actif arrivé le plus tôt, sinon ferme la salle. Course, bots, bonus, photos, stats et historique restent futurs.

## Seed de développement S1

Après les migrations, `pnpm db:seed:s1` crée deux utilisateurs synthétiques sans credentials ni sessions et une salle exemple fermée, avec deux adhésions inactives. Le script accepte seulement une base locale nommée `*_dev` ou `*_test`, hors production. Les tests PostgreSQL vérifient répétition, concurrence, conservation des données existantes et rollback en cas de collision. Ce seed ne fournit ni compte de démonstration connectable ni corpus/historique de course final.

## Vérification

Référence vérifiée : [`66787c07`](https://github.com/Ap0llonn/web5-multiplayer-typing/commit/66787c07d6fb691419c76e9c736370a03673583c), 3 octobre 2026. [Quality](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37146692723) : **44 unitaires, 20 intégrations PostgreSQL et 14 scénarios Chromium**, avec installation, Prisma/migrations, lint/types/frontières, build et smoke HTTP/SSE. [Local infrastructure](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37146692732) : validation Docker Compose et smoke PostgreSQL/Redis/S3 avec persistance après `down`/`up`. Les deux workflows sont distincts ; ces preuves locales/CI ne valident pas la production ni le Sprint 1 entier.

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

VPS public HTTPS obligatoire ; aucun VPS, compte ou secret de production n'a été créé par ce commit. Sur le VPS approuvé : installer Node, fournir variables, appliquer migrations, build, exécuter `pnpm start` derrière Nginx. Exemple [reverse proxy](deploy/nginx.conf.example) à adapter, DOIT écraser X-Forwarded-For, désactiver buffering SSE, limiter corps et isoler port3000. Les callbacks OAuth doivent correspondre exactement au domaine HTTPS. Faire le test réel depuis deux sessions séparées avant validation de la remise. Ne pas exposer directement Next derrière un proxy qui conserve un X-Forwarded-For fourni par le client.

[Preuves et limites](docs/verification.md) · [Checkpoint](docs/CHECKPOINT_1.md) · [ADR](docs/adr/0001-data-realtime.md)
