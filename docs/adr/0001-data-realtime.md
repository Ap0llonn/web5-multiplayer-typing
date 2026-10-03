# ADR 0001 — PostgreSQL, autorité et présence au checkpoint

Statut : implémenté localement pour le salon ; déploiement/mesures VPS à vérifier. La sémantique de présence est corrigée par [ADR 0002](0002-client-presence.md) : observation SSE sans renouvellement, heartbeat explicite du navigateur.

## Décision

Monolithe modulaire Type/Next sur un processus Node persistant derrière reverse proxy HTTPS. Better Auth possède les sessions et son protocole. PostgreSQL est l'unique autorité durable pour Lobby, LobbyMember et version de salon. Le diagramme relationnel, la machine de course future et les bots sont dans [ARCHITECTURE.md](../ARCHITECTURE.md).

Chaque mutation passe par composition → identité serveur → lobby serveur → superviseur pur → repository. Le repository sérialise les mutations structurelles avec un verrou de ligne FOR UPDATE, sous READ COMMITTED. Les heartbeats prennent un verrou partagé FOR SHARE et ne mettent à jour que leur propre LobbyMember, sans écrire la ligne/version commune du salon. Les autres heartbeats restent concurrents ; les changements d’adhésion/état attendent la fin de ce court échantillonnage. Création salon+hôte est atomique. Code aléatoire cryptographique à 6 caractères, alphabet excluant 0/O/1/I/L, unicité DB, cinq essais en collision. Contrainte DB nullable unique activePlayerIdentityId : une seule adhésion active par personne ; clé (lobbyId,playerIdentityId) : un seul siège, même avec plusieurs onglets. CHECK capacity 2–30 ; spectateurs exclus du calcul.

Pour S1, HTTP POST porte les commandes et SSE same-origin diffuse un instantané complet par seconde. Un numéro de version monotone est persisté avec chaque changement structurel (adhésion/état). La présence est un échantillon volatil : plusieurs snapshots de la même version peuvent rafraîchir les indicateurs en ligne. Les clients ignorent les versions plus anciennes et chaque reconnexion reçoit un instantané intégral ; aucun journal d'événements à rejouer. Chaque tick revérifie session et adhésion avant de lire/transmettre. L'URL n'est pas une preuve d'accès. Les snapshots ne portent ni authUserId, email, cookie, IP ni secret. Le transport ne contient aucune règle métier.

Une présence est fraîche pendant 10 secondes, puis affichée « reconnexion » ; siège conservé 30 secondes après le dernier heartbeat. L'expiration se réconcilie transactionnellement quand un salon est consulté : aucune tâche cron nécessaire. Un départ explicite ne dépend pas d'un unload navigateur. L'hôte est transféré au compte actif arrivé le plus tôt, sinon la salle ferme et libère les adhésions. Une identité invitée permet le rechargement mais ne fournit pas d'historique de course ni de photo. Le salon S1 est « Sur code », pas le futur mode Privée à invitations IP-liées.

## Sécurité et exploitation

Les mutations vérifient Origin et session serveur ; schémas stricts et corps limités à 4 Ko. Limitation code/création : 10 essais/minute/IP via compteur SQL atomique ; le reverse proxy DOIT écraser X-Forwarded-For et le port Node n'est pas exposé directement. Better Auth conserve son limiteur HTTP, cookie HttpOnly et hachage scrypt. Les valeurs OAuth partielles sont rejetées ; les deux providers réels sont obligatoires pour valider AUTH-01 et restent non testés sans credentials. Production exige HTTPS, sauf boucle locale pour les tests du build de production.

## Compromis et extension

SSE consomme une connexion par onglet et une lecture par snapshot ; les heartbeats HTTP du navigateur réalisent une transaction courte toutes les cinq secondes. Les erreurs transitoires produisent un événement transient-error puis sont réessayées, sans abandon du salon ; les refus d’autorisation/fermetures terminent le stream. Seul le membre modifié est réécrit ; pas une réécriture de toute la liste. Le test local synchronisé de30 membres passe quatre rafales sans conflit après la correction de contention ; aucune preuve de charge VPS n'est annoncée. Les spectateurs n'ont pas de plafond produit arbitraire ; une politique de ressources sera nécessaire avant ouverture publique. Les données RateLimit demandent une purge d'exploitation des anciennes entrées. Pas de DB à chaque frappe future : le serveur de course devra regrouper messages, appliquer l'autorité progression/temps et prouver ≥4 mises à jour perçues/s ; WebSocket restera une option selon mesures. Course, bonus et bots ne sont pas implémentés par ce transport.

## Correction issue de la revue

La première version écrivait la ligne/version Lobby dans chaque heartbeat SERIALIZABLE : le test de30 membres reproduisait15–17 échecs par rafale. Cette stratégie est remplacée par les verrous partagé/exclusif ci-dessus. Le script indépendant du reviewer passe désormais30/30 sur quatre rafales (43–56ms dans ce cloud, aucune extrapolation VPS). La garde de génération de la présentation empêche aussi un ancien chargement initial de masquer une création/entrée plus récente.
