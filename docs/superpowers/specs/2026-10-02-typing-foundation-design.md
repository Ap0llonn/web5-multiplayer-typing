# Socle Next.js du jeu de frappe multijoueur

Date : 2 octobre 2026 · Dépôt : `Ap0llonn/web5-multiplayer-typing`

Statut : proposition écrite à valider avant le plan d’implémentation. Aucun code applicatif, dépendance, secret ou déploiement créé à ce stade.

## 1. But et périmètre

Créer un socle propre pour un jeu de frappe compétitif, accessible aux invités comme aux comptes, en reprenant les frontières utiles de Type. Le dépôt cible est actuellement vide. Référence inspectée : [Type, révision eb3cbf0, application tempo](https://github.com/Ap0llonn/Type/tree/eb3cbf0943a227d66e8e53ba2d2988d777e4d19c/tempo).

Ce lot prépare principalement les issues [architecture #3](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/3) et [socle/CI #6](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/6), avec les fondations d’identité, données et interface nécessaires à #4, #7 et #8. Il ne clôture pas tout le [sprint du 5 octobre](https://github.com/Ap0llonn/web5-multiplayer-typing/milestone/1).

Inclus : Next.js App Router/TypeScript, modules `identity` et `lobby`, PostgreSQL/Prisma, migration initiale d’identité, contrats et tests, FR/EN, vrai thème clair/sombre persistant, commandes de contrôle et GitHub Actions, documentation de démarrage.

Exclus de ce premier lot : création/entrée fonctionnelle des salons, serveur temps réel, reconnexion du salon, course, scoring, bonus, bots, classement, historique, identité visuelle finale et déploiement. Aucun faux salon ou faux succès d’authentification ne doit masquer ces exclusions. Les routes et boutons non fonctionnels ne sont pas publiés comme des fonctionnalités disponibles.

## 2. Choix d’authentification et décision précise

**Recommandation : Better Auth**, avec stockage PostgreSQL et adaptateur Prisma. Ses extensions username et anonymous correspondent au besoin ; GitHub et Discord sont documentés. Auth.js conseille lui-même Better Auth pour les nouveaux projets. [Migration officielle Auth.js](https://authjs.dev/getting-started/migrate-to-better-auth), [Prisma](https://better-auth.com/docs/adapters/prisma)

Deux alternatives examinées :

- Auth.js Credentials accepte un identifiant personnalisé, mais laisse à l’application la persistance des comptes, le hachage et les protections contre les tentatives répétées. Cela augmente le travail de sécurité dans ce sprint. [Credentials](https://authjs.dev/getting-started/authentication/credentials)
- Un service d’identité configurable comme Ory peut porter des identifiants personnalisés, mais ajoute un service et de l’exploitation au socle. Ce n’est pas le choix recommandé pour le checkpoint. [Ory Kratos](https://www.ory.com/docs/network/kratos/intro)

**Contrainte à faire valider : le plugin username de Better Auth exige encore une adresse email à l’inscription.** La connexion peut ensuite utiliser uniquement identifiant et mot de passe. Le besoin reçu ne demandait pas d’email : cette collecte ne sera pas ajoutée implicitement, et aucune fausse adresse ne sera créée pour les comptes. [Contrat officiel d’inscription](https://better-auth.com/docs/plugins/username)

Décision attendue : « Accepter une adresse email à l’inscription, en conservant identifiant/mot de passe à la connexion ? » Si oui, Better Auth est retenu et le premier parcours de compte est celui-ci. Si non, le contrat username-only reste inchangé et le choix du moteur de comptes doit être revu avant ce lot d’authentification. Le squelette architectural reste indépendant de cette décision.

L’absence de récupération de mot de passe est conservée : aucun écran ou mécanisme “mot de passe oublié”, aucune promesse de restauration d’un compte perdu. L’email, s’il est accepté, n’implique pas l’ajout d’un service d’envoi d’emails.

## 3. Frontières et fichiers

Application à la racine du nouveau dépôt ; aucun répertoire `tempo/` hérité.

```text
src/
  app/[locale]/layout.tsx, page.tsx
  app/[locale]/(auth)/login/page.tsx, signup/page.tsx
  app/api/auth/[...all]/route.ts
  proxy.ts
  composition/home/home-page.tsx
  composition/auth/login-page.tsx, signup-page.tsx
  composition/lobby/                 # orchestration intermodules à venir
  modules/identity/
    public.ts, server.ts, container.ts
    contracts/, domain/, presentation/
    supervisors/interfaces/, supervisors/implementations/
    repositories/interfaces/, repositories/implementations/
    infrastructure/                 # adaptateur d’authentification
  modules/lobby/
    public.ts, server.ts, container.ts
    contracts/, domain/
    supervisors/interfaces/
    repositories/interfaces/
  shared/
    contracts/operation-result.ts
    infrastructure/env/server.ts, db/prisma.ts
    infrastructure/auth/config.ts
    presentation/i18n/{routing,navigation,request}.ts
    presentation/i18n/messages/{fr,en}.json
    presentation/theme/provider.tsx, theme-toggle.tsx
    presentation/ui/, styles/tokens.css
prisma/schema.prisma
prisma/migrations/
tests/{unit,integration,e2e}/
.github/workflows/ci.yml
.env.example, README.md, docs/architecture.md
```

Les dossiers de salon illustrent les frontières ; on ne crée que les contrats utiles, pas de services vides, dépôts factices ou implémentations qui retournent un succès inventé.

Flux métier : route fine → composition → action serveur de module → superviseur → interface de repository → implémentation. Pour un workflow intermodules, l’action appartient à la composition. La composition utilise les interfaces publiques serveur ; elle ne lit jamais un repository concret. Aucun module n’importe un autre module, `app` ou `composition`. `shared` n’importe aucun module. [Architecture Type inspectée](https://github.com/Ap0llonn/Type/blob/eb3cbf0943a227d66e8e53ba2d2988d777e4d19c/tempo/docs/architecture.md)

Audit de reprise : dans Type, `SignupResult` est importé sans être exporté ; l’interface annonce un booléen, le superviseur ne retourne pas le résultat attendu et l’action attend `created`. La connexion peut retourner `false` sans que l’action le traite avant redirection. Aucun workflow CI ni migration Prisma n’a été trouvé dans cette révision ; le serveur temps réel n’est pas implémenté. Ces éléments sont remplacés, pas copiés. Les environnements privés, tunnels, branding et données de démonstration restent également exclus.

`public.ts` n’exporte que les contrats partageables. `server.ts`, conteneurs, DB, configuration et adaptateurs portent `server-only`. Les composants client n’importent ni conteneur, ni Prisma, ni secret. Les superviseurs ne connaissent ni Next.js, ni Prisma, ni WebSocket. Les actions valident et autorisent les appels ; les superviseurs portent les règles ; les repositories traduisent les erreurs fournisseur en erreurs stables.

L’authentification protocolaire reste une exception explicite : le handler officiel Better Auth gère les échanges HTTP, callbacks, cookies et protections associées. Les formulaires passent par le client officiel encapsulé dans le module identité. On ne réécrit pas le protocole pour imposer artificiellement une chaîne de repositories. Les opérations métier utilisent toujours les frontières décrites ci-dessus. Une éventuelle Server Action appelant `auth.api` doit posséder son propre limiteur : ces appels contournent le limiteur intégré. [Next.js](https://better-auth.com/docs/integrations/next), [limitation de débit](https://better-auth.com/docs/concepts/rate-limit)

## 4. Identité, sécurité et données

Si Better Auth est validé : schéma généré compatible avec la version verrouillée, modèles `User`, `Session`, `Account`, `Verification`, champs username et anonymous, plus `PlayerIdentity` appartenant à l’application. La migration Prisma versionnée est la seule source de schéma exécuté ; pas de copie du SQL et du Prisma divergents de Type.

`PlayerIdentity` possède un identifiant opaque stable et un lien unique vers l’utilisateur d’authentification. Les futurs participants de salon référencent cette identité, jamais un nom affiché ni un identifiant envoyé librement par le navigateur. Les invités obtiennent une vraie session serveur et les mêmes droits de participation. Leur pseudonyme d’affichage n’est pas une preuve d’identité. Aucun plafond produit arbitraire de 32 personnes n’est introduit.

Proposition de session : 7 jours, renouvellement quotidien lors d’une activité valide ; fermeture d’onglet et perte réseau ne recréent pas l’identité. Session expirée, déconnexion ou cookies effacés ne permettent pas une récupération anonyme garantie. Aucun historique invité n’est supprimé automatiquement dans ce lot. [Sessions](https://better-auth.com/docs/concepts/session-management)

La conversion invité→compte n’est pas activée implicitement : le plugin peut supprimer l’utilisateur invité par défaut. Elle nécessite ultérieurement un transfert transactionnel/idempotent de l’identité et des participations ; jusque-là, conserver l’identité invitée et désactiver sa suppression automatique. La fusion des comptes par seule égalité d’email est désactivée. [Anonymous](https://better-auth.com/docs/plugins/anonymous), [liaison des comptes](https://better-auth.com/docs/concepts/users-accounts)

Les mots de passe restent exclusivement dans le moteur d’authentification avec son hachage maintenu. Jamais de copie du hasher, des sessions de 60 secondes ou des résultats incohérents de Type. Les contrôles d’accès relisent une session serveur valide pour chaque action protégée ; proxy et layout ne sont pas des barrières suffisantes. Les erreurs client sont typées et traduites : validation, accès absent, conflit, fournisseur indisponible, échec interne. Aucun détail DB, token ou mot de passe ne remonte dans l’UI ou les logs.

## 5. Point d’intégration des futurs salons

L’opération future `composition/lobby/actions/create-lobby.action.ts` valide l’entrée, obtient l’acteur via l’interface publique d’identité, puis appelle le superviseur de salon avec cet acteur construit côté serveur. Le repository crée salon, code unique et adhésion hôte dans une transaction. Les collisions de code sont réessayées de façon bornée ; `(lobbyId, playerIdentityId)` est unique. La réponse est un résultat typé, pas un booléen ambigu.

Le futur serveur temps réel est un adaptateur de transport d’un processus capable de maintenir des connexions. Il vérifie session et appartenance au salon, puis appelle les mêmes cas métier. Il reste autoritaire sur les versions d’état, présence et future course. Une Server Action ne porte pas une connexion persistante. Les instantanés auront une version monotone ; une reconnexion ou un trou dans les événements déclenchera une resynchronisation. Transport, hébergeur et délai de conservation du salon relèvent de l’ADR #5, pas de ce squelette.

## 6. Interface, tests et reproductibilité

`next-intl` conserve des URLs `/fr` et `/en`, FR par défaut, avec navigation et préférence persistante. `next-themes` porte clair/sombre et persistance ; le sélecteur attend le montage pour éviter un rendu client/serveur divergent. Tokens neutres et accessibles en attendant la direction artistique, sans marque Type ni fausses données. [Routage](https://next-intl.dev/docs/routing/setup), [thèmes](https://github.com/pacocoursey/next-themes)

Tests et critères de réception :

- Unitaires : validation des contrats, traduction des erreurs, autorisation identique invité/compte, import boundaries
- Intégration sur PostgreSQL jetable : migration depuis une DB vide, unicité identité, session valide/absente/expirée/révoquée ; après décision auth, inscription, doublon normalisé, mauvais mot de passe et déconnexion
- Navigateur : FR/EN et clair/sombre après rechargement, clavier/mobile, absence d’erreur d’hydratation, aucun écran de succès après erreur ; répétition de clics et retours navigation
- OAuth : tests de configuration absent/partiel, puis vrais callbacks local et HTTPS seulement après fourniture des secrets ; mocks explicitement distincts des preuves OAuth réelles
- CI PR/main : installation verrouillée, génération/validation Prisma, lint, typecheck, tests, migrations de test, build ; secrets de test éphémères, aucun secret de production requis ; vérifier qu’une erreur volontaire fait échouer les contrôles avant de la corriger

Les versions stables compatibles seront vérifiées et verrouillées au début de l’implémentation ; le lockfile et la version Node sont versionnés. Avant de coder, lire les instructions et docs livrées avec la version Next.js installée. Un build vert ne vaut pas preuve de connexion OAuth ni de déploiement.

## 7. Dépendances et arrêt de ce lot

Variables requises au runtime : `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. GitHub/Discord sont chacun activés uniquement avec une paire complète client ID/secret ; configuration partielle rejetée, absence annoncée par l’UI sans faux succès. Callbacks sous `/api/auth/callback/github` et `/api/auth/callback/discord`. [GitHub](https://better-auth.com/docs/authentication/github), [Discord](https://better-auth.com/docs/authentication/discord)

Ces secrets et l’URL HTTPS ne sont pas disponibles. `.env.example` décrit leurs noms avec valeurs vides, sans réutiliser celles de Type. Aucune création d’identifiants OAuth, ouverture d’accès persistant ou publication n’est incluse dans cette proposition.

Validation demandée : architecture, périmètre du premier lot et décision email. Après approbation de cette spécification, produire le plan d’implémentation et faire choisir son mode d’exécution. Ce document n’annonce aucun test applicatif déjà exécuté.
