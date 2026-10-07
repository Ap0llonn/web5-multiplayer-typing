# Développement local avec Docker Compose

## Périmètre

Ce lot répond à la demande de développement local avec PostgreSQL, Redis et un stockage S3 pour les images (`TECH-04`, `TECH-10`, `DOC-FINAL-README`). `compose.yaml` lance Next.js en mode développement avec rechargement à chaud et PostgreSQL, Redis et S3. PostgreSQL est utilisé par Prisma ; Redis et S3 sont disponibles pour les prochaines fonctionnalités, **sans connexion applicative, client SDK ni upload de photo implémentés**. Ce Compose ne constitue pas un déploiement de production.

Services épinglés :

- `postgres:18.4`, même version que la CI applicative
- `redis:8.2.10-alpine`, image officielle, authentification et journal AOF dans `/data`
- `chrislusf/seaweedfs:4.48`, image publiée par le mainteneur, mode mono-nœud `mini`, API compatible S3 et bucket `typing-images` créé au démarrage

SeaweedFS permet ce stockage local sans compte AWS ni licence commerciale. Le choix évite de dépendre des anciens binaires communautaires MinIO, dont le dépôt annonce l’arrêt de maintenance. Sources consultées le 3 octobre 2026 : [PostgreSQL officiel et stockage version 18](https://hub.docker.com/_/postgres), [Redis officiel](https://hub.docker.com/_/redis), [SeaweedFS 4.48](https://github.com/seaweedfs/seaweedfs/releases/tag/4.48), [démarrage SeaweedFS](https://github.com/seaweedfs/seaweedfs/wiki/Quick-Start-with-weed-mini), [statut MinIO](https://github.com/minio/minio).

## Premier démarrage

Prérequis : Node 24.19.0, pnpm 11.19.0 et un moteur Docker démarré avec Compose **v2.20 ou plus récent**. Linux et Docker Desktop sur macOS/Windows conviennent ; la CI vérifie Linux. Aucun script ne démarre ni ne reconfigure Docker Desktop automatiquement.

Depuis la racine du dépôt :

```sh
pnpm install --frozen-lockfile
cp -n .env.example .env  # Ne pas écraser un fichier existant
openssl rand -base64 32
# Copier le résultat dans BETTER_AUTH_SECRET, dans .env uniquement.
pnpm infra:validate
pnpm infra:up
# Vérifier que DATABASE_URL pointe bien vers PostgreSQL local.
pnpm exec prisma migrate deploy
```

Ouvrir http://localhost:3000. `infra:up` attend les healthchecks PostgreSQL, Redis et API S3, ainsi que le démarrage du conteneur applicatif. Le service applicatif monte le code du checkout et conserve ses dépendances/cache dans des volumes Docker. Le seed S1 reste optionnel et possède ses propres garde-fous : [SEED-S1.md](SEED-S1.md).

`pnpm dev` et `pnpm build` exécutent `pnpm db:generate` avant Next.js, y compris après un checkout sans fichiers générés. Une migration réussie ne génère pas le client TypeScript. En cas d’erreur `Can't resolve '@/generated/prisma/client'` sur un serveur déjà lancé, l’arrêter puis relancer `pnpm dev`. Les commandes indépendantes de types, tests et seed nécessitent toujours la préparation explicite du client.

Le profil est disponible à `/fr/profile` et `/en/profile`, depuis le lien de navigation des comptes. La migration additive `20261007130000_profile_photo` est nécessaire : après vérification de la cible locale documentée, appliquer `pnpm exec prisma migrate deploy` et régénérer le client. Les photos personnelles redimensionnées sont stockées dans PostgreSQL, une par compte ; le bucket S3 n’est pas requis pour cette fonctionnalité. Aucun original n’est stocké. Les statistiques et l’historique attendent l’implémentation des courses.

`BETTER_AUTH_SECRET` est obligatoire et doit contenir au moins 32 caractères. La valeur versionnée est un exemple public réservé au développement ; remplacez-la par une valeur aléatoire locale avant d'utiliser l'authentification. Si la configuration est invalide, le terminal indique uniquement les noms des variables à corriger et les pages affichent une erreur traduite. Corriger le fichier local puis redémarrer Next.js ; aucune valeur secrète ne doit être copiée dans un rapport.

Les valeurs `local-…-example` sont des exemples publics réservés au développement local. Ne jamais copier des secrets de production ici. `.env` est ignoré par Git ; seuls `.env.example` (local) et `.env.production.example` (modèle Dokploy avec marqueurs à remplacer) sont versionnés. Laisser OAuth vide ne valide pas la recette GitHub/Discord.

Compose lit `.env`, **pas `.env.local`**. Next.js peut donner priorité à `.env.local` : s’il existe déjà, vérifier qu’il ne masque pas `DATABASE_URL` ou l’origine locale. `infra:validate` et `test:compose` utilisent toujours les exemples, jamais les secrets de `.env`.

## Installation Docker sur Apple Silicon

Docker utilise Linux ARM64 sur les Mac Apple Silicon. `pnpm-workspace.yaml` autorise explicitement le postinstall de `@embedded-postgres/linux-arm64`, comme ceux des variantes Linux x64 et macOS déjà utilisées. Ce script restaure les liens du paquet PostgreSQL de test verrouillé ; il ne démarre aucune base. Sans cette entrée, pnpm 11 termine `install --frozen-lockfile` avec `ERR_PNPM_IGNORED_BUILDS`, même si les téléchargements ont réussi.

Après cette correction, relancer `pnpm infra:up`. Pour voir les logs détaillés d’une erreur de construction : `docker compose --progress plain build app`. Conserver le lockfile et les approbations explicites par paquet.

## Connexions depuis l’hôte

- PostgreSQL : `127.0.0.1:5432`, base `typing_dev`, utilisateur `typing` ; `DATABASE_URL` est déjà renseignée pour les valeurs d’exemple
- Redis : `127.0.0.1:6379` ; `REDIS_URL` contient le mot de passe d’exemple
- S3 : http://127.0.0.1:8333, région `us-east-1`, bucket `typing-images` ; clés `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`

Le futur SDK S3 devra utiliser cet endpoint, la région et `forcePathStyle: true`. Les objets restent privés : pas de politique de lecture anonyme, pas de clé `NEXT_PUBLIC_*`. Les URLs signées/contrôles de type réel, taille, droits et nettoyage devront être ajoutés avec la fonctionnalité photo. Les consoles administratives SeaweedFS, WebDAV et catalogues ne sont pas publiés ; la télémétrie master est désactivée.

## Production avec Dokploy

`compose.production.yaml` ne lance que l’application Next.js. Il attend un PostgreSQL externe et n’installe ni PostgreSQL, ni Redis, ni stockage S3. Dans Dokploy, choisir le déploiement Docker Compose, utiliser ce fichier et configurer les variables de [.env.production.example](../.env.production.example) dans l’environnement du service. `DATABASE_URL` doit pointer vers le PostgreSQL de production accessible depuis le réseau Dokploy ; `BETTER_AUTH_URL` doit être l’origine HTTPS publique exacte. L’application écoute sur le port interne 3000, à associer au domaine HTTPS dans Dokploy.

Remplacer tous les `CHANGE_ME`, générer un `BETTER_AUTH_SECRET` distinct avec `openssl rand -base64 32`, et enregistrer les callbacks GitHub/Discord sous `BETTER_AUTH_URL/api/auth/callback/github` et `/discord`. Ne pas téléverser le fichier d’exemple avec de vraies valeurs. Redis et S3 apparaissent dans le modèle pour documenter les services envisagés, mais l’application ne les consomme pas actuellement.

Les migrations de production ne sont pas lancées automatiquement au démarrage. Avant de router le trafic vers une nouvelle version, appliquer `prisma migrate deploy` une fois depuis le conteneur de l’application ou une tâche de release Dokploy, avec la vraie `DATABASE_URL` et après validation/sauvegarde de la base cible. Ne jamais utiliser une base inconnue ou de production pour les tests locaux.

Pour inspecter l’infrastructure :

```sh
pnpm infra:status
docker compose exec postgres psql -U typing -d typing_dev -c 'SELECT 1'
docker compose exec redis redis-cli ping
curl --fail http://127.0.0.1:8333/status
pnpm infra:logs
```

Le service Redis fournit `REDISCLI_AUTH` au client exécuté dans son conteneur. Les clients lancés sur l’hôte doivent fournir leur authentification. Le healthcheck S3 prouve la disponibilité de l’API ; le test ci-dessous prouve une écriture/lecture signée réelle.

## Arrêt, redémarrage et données

```sh
pnpm infra:down
pnpm infra:up
```

`infra:down` retire les conteneurs et le réseau, **conserve les trois volumes nommés** et n’efface aucune donnée de développement. PostgreSQL 18 monte `/var/lib/postgresql` (sa sous-arborescence `18/docker` contient les données), Redis et SeaweedFS montent `/data`. Ne pas ajouter `--volumes` à l’arrêt normal. Aucune commande de purge des données de développement n’est fournie.

Les identifiants et le nom de la base PostgreSQL initialisent uniquement un volume vide. Les changer dans `.env` ne change pas une base existante : conserver les anciennes valeurs ou effectuer une migration explicite après sauvegarde. Les clés S3 configurées par variables d’environnement sont relues au démarrage : après modification de `.env`, recréer seulement le conteneur avec `docker compose up --detach --force-recreate --wait s3` conserve les images et charge les nouvelles clés. Cela ne décrit pas d’éventuelles identités supplémentaires gérées dans le filer. Ne jamais supprimer les volumes pour contourner une erreur d’authentification.

En cas de port occupé, changer `POSTGRES_PORT`, `REDIS_PORT` ou `S3_PORT` dans `.env`, puis adapter respectivement `DATABASE_URL`, `REDIS_URL` ou `S3_ENDPOINT`. Les ports internes restent 5432/6379/8333 ; dans un éventuel conteneur applicatif futur les hôtes seraient `postgres`, `redis`, `s3`, pas `127.0.0.1`. Pour un deuxième checkout en parallèle, choisir aussi un `COMPOSE_PROJECT_NAME` distinct dans son `.env`.

## Vérification reproductible

```sh
pnpm infra:validate
pnpm test:compose
```

Le premier appelle le vrai parseur Docker Compose et vérifie les images épinglées, les seuls ports attendus sur loopback, les healthchecks et les volumes. Il ne démarre aucun conteneur. Pour vérifier une personnalisation de `.env` sans afficher ses secrets : `docker compose config --quiet`.

Le second utilise les exemples locaux, des ports hôte automatiquement attribués et un nom de projet aléatoire `typing-compose-test-…`, sans toucher à `typing-local` ni à `.env`. Il attend les services, écrit une ligne PostgreSQL, une clé Redis et un PNG via S3 Signature V4, vérifie la relecture et le refus anonyme, puis refait ces contrôles après un `down`/`up`. Enfin il retire **uniquement ses propres volumes jetables**. En cas d’interruption forcée, des ressources de ce projet de test peuvent rester : inspecter leur nom avant toute intervention.

Le workflow [.github/workflows/compose.yml](../.github/workflows/compose.yml) exécute ces deux commandes à chaque push/PR sur un runner disposant de Docker. Les tests applicatifs continuent d’utiliser leur PostgreSQL jetable distinct. Aucun test ne réinitialise une base de développement ou de production.

Le poste cloud de préparation n’a pas Docker/Podman : le démarrage réel des conteneurs et leur persistance doivent être confirmés par le résultat de ce workflow, pas déduits des tests unitaires. Voir [verification.md](verification.md) pour les preuves disponibles.
