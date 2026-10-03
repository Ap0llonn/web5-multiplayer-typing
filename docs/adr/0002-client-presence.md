# ADR 0002 — présence renouvelée par le navigateur

Statut : correctif S1 en préparation après échec Chromium de PR #35 ; ne constitue pas encore une preuve de recette réussie.

## Constat

Le test de coupure réseau conserve « Online » pendant vingt secondes. La chaîne SSE appelait `heartbeat` à chaque tick serveur : cette simple observation renouvelait `lastSeenAt`, sans nouvelle activité du navigateur. Une connexion TCP/SSE encore ouverte n’est pas une preuve que le client reçoit les données. Le défaut est aussi reproductible sur PostgreSQL : une observation serveur rend fraîche une présence vieille de douze secondes.

## Décision et limites

- SSE conserve ses snapshots complets, versions et autorisations revalidées ; sa lecture ne renouvelle plus la présence
- Le navigateur envoie un heartbeat HTTP POST immédiat puis toutes les cinq secondes dans sa salle ; une requête à la fois, timeout quatre secondes, arrêt/abort quand le composant quitte la salle
- Le POST `/api/lobbies/[code]/heartbeat` vérifie origine, vraie session, code et corps vide strict ; seul le repository renouvelle la ligne d’adhésion de l’acteur serveur. Aucune identité ou heure client n’est acceptée
- Le service d’observation lit la salle active autorisée. Il peut réconcilier les expirations par la transaction existante, sans renouveler le temps d’aucun membre
- Les dix secondes d’indication « reconnexion » et trente secondes de grâce ne changent pas. Après la grâce, le heartbeat ne ressuscite pas une ancienne adhésion. Départ explicite et succession/fermeture restent distincts
- GET `/me` reste une requête réelle du client pour retrouver sa salle ; sa vérification initiale peut renouveler la présence. Ce n’est jamais appelé par la boucle SSE
- L’état de connexion visible dépend du stream et du heartbeat : recevoir encore un snapshot ne masque pas une requête client échouée
- Les réponses tardives d’un heartbeat sont ignorées après arrêt/changement de salle ; les snapshots restent autoritaires. Les échecs transitoires sont réessayés, les refus d’accès ferment la vue
- Aucun nouveau cookie, grant OAuth, credential, service externe, schéma DB ou déploiement. Les frontières monolithe modulaire restent identiques ; le handler appelle la composition puis les façades et superviseurs

Le trafic de présence client est d’environ douze requêtes/minute/onglet. La limite actuelle de création/entrée par code ne s’applique pas au heartbeat, afin de ne pas expirer des utilisateurs partageant une IP ou plusieurs onglets. Les limites opérationnelles et la charge du VPS restent à mesurer ; cette correction n’est pas une certification de capacité.

## Vérification requise

1. RED PostgreSQL : observer un membre depuis SSE ne change pas son timestamp et montre « reconnexion » après dix secondes ; observation seule ne prolonge pas la grâce
2. POST autorisé renouvelle uniquement sa participation ; invité autorisé comme membre, non-membre/origine étrangère/champ acteur falsifié refusés ; session révoquée refusée
3. Timers navigateur : immédiat, séquentiel, reprise après erreur, délai borné et abort/arrêt sans réponse tardive appliquée
4. Conserver concurrence trente membres, dernières places, unicité et expirations ; full agrégat local
5. Rejouer la vraie coupure/reprise invité puis hôte en Chromium distant, mêmes IDs/host, aucun doublon, délais consignés ; recette HTTPS de production toujours ouverte
