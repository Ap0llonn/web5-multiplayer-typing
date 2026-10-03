# Instructions de développement

Lire `docs/ARCHITECTURE.md`, `docs/EXIGENCES.md` et les instructions du code concerné avant de modifier le projet. Cette architecture est obligatoire, pas une suggestion. Le PDF Web V et les décisions utilisateur récentes priment sur les anciens plans ; signaler et documenter les contradictions, ne jamais deviner silencieusement.

## Frontières non négociables

- `src/app` route ; `src/composition` assemble et coordonne ; `src/modules` possède les cas métier ; `src/shared` reste générique.
- Un module n'importe aucun autre module, `app` ou `composition`, même pour un type. `shared` n'importe aucun module.
- Hors d'un module, utiliser `public.ts` pour les types, `server.ts` pour les API serveur, ou une entrée de présentation publique. Jamais de container, repository ou superviseur concret.
- `public.ts` est type-only. `server.ts`, containers, DB et configuration portent `server-only`. Aucun import serveur dans un composant client.
- `container.ts` câble seulement. Un superviseur dépend d'interfaces injectées, sans Next.js, React, Prisma, Better Auth, HTTP/SSE/WebSocket ou variable d'environnement.
- Les repositories concrets possèdent Prisma, les transactions et la traduction des erreurs fournisseur. Les superviseurs portent les règles ; la composition porte le workflow entre modules.
- L'adaptateur temps réel appelle la composition, qui résout l'identité et appelle lobby. Ne pas relier les modules directement ni déplacer le métier dans le transport.
- Exception auth : handler et client officiels Better Auth encapsulés ; ne pas réimplémenter son protocole pour simuler des couches métier. `identity/infrastructure/auth-client.ts` est l'adaptateur navigateur explicite, sans import serveur.

## Contrats et sécurité

- Schéma serveur pour chaque entrée ; validation client seule insuffisante. Identité obtenue depuis la session réelle, jamais depuis un ID/rôle fourni par le navigateur.
- Autoriser chaque opération et chaque accès à une salle côté serveur. Un layout/proxy/bouton caché ne protège rien à lui seul.
- Retourner `OperationResult<T>` : `ok: true` avec `value`, ou `ok: false` avec code fermé et clé traduisible. Jamais de booléen ambigu, faux succès ou fuite d'erreur Prisma.
- Création réservée aux comptes ; invités autorisés à rejoindre avec pseudo 3–20 caractères. Capacité 2–30 participants, spectateurs exclus ; hôte participant ou spectateur.
- Code unique de six caractères sans `0 O 1 I L`. Une seule salle active par personne garantie en DB, pas seulement par une lecture préalable. Transactions pour les invariants de salle.
- Aucun secret dans Git, résultats, captures ou logs. Pas de hasher/session maison, fusion de comptes implicite, récupération de mot de passe inventée ou identité bot dans Better Auth.

## Manière de travailler

1. Rattacher le changement à une exigence, préciser le module propriétaire et le contrat avant de coder.
2. Écrire le test pertinent, vérifier qu'il détecte le défaut, puis ajouter le minimum d'implémentation. Ne pas créer de dossiers/services vides ni de généralisation sans usage.
3. Préserver une UI simple, réelle, Tailwind, FR/EN et clair/sombre ; tous les textes visibles sont traduits. Langue navigateur au premier accès, préférence explicite persistée ensuite, repli FR.
4. Code et nouveaux scripts en TypeScript strict ; aucun `any` explicite. Justifier chaque suppression de type. Noms de fichiers `kebab-case`, types/classes `PascalCase`, fonctions `camelCase`.
5. Tester avec PostgreSQL jetable. Ne jamais reset/migrate une base de production ou inconnue pour exécuter un test. Ne pas toucher aux secrets ni publier/déployer sans l'autorisation requise.
6. Exécuter lint, typecheck, `check:boundaries`, unitaires, intégration, build et E2E pertinents sur l'état final. Reporter séparément passé, échoué et non exécuté. Un mock OAuth ou un build ne prouve pas une connexion réelle.
7. Mettre à jour architecture, migrations, traductions, tests et matrice d'exigences quand le changement les affecte. Ne déclarer « complet » que ce qui a une implémentation et une preuve adaptées.

Le nom et le logo sont exclusivement créés par l'étudiant sans IA. Aucun agent ne les invente ou ne génère de faux croquis. Course, bonus et bots restent futurs tant qu'ils ne sont pas réellement implémentés ; le design déterministe des bots dans l'architecture n'est pas une fonctionnalité livrée.

Avant d'utiliser une API Next.js, consulter les instructions et la documentation de la version installée dans `node_modules/next`. Les fichiers `docs/superpowers/` sont l'historique de planification, pas une autorisation de revenir à un périmètre obsolète.
