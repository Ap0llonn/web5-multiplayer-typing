# Dossier de réception du checkpoint 1

État au 3 octobre 2026, après la CI main terminée à 14 h 02 UTC · Échéance de travail : **lundi 5 octobre 2026** · Dépôt `Ap0llonn/web5-multiplayer-typing`

Ce dossier organise les preuves du checkpoint ; **il ne déclare pas le Sprint 1 terminé**. Le socle technique est vérifié sur le commit main `80b7a5c` : [CI 37128079856](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37128079856), 23 unitaires, 14 intégrations PostgreSQL et 4 scénarios Chromium, plus installation/migrations/lint/types/frontières/build/HTTP-SSE. Aucune URL de production fonctionnelle ni callback OAuth réel n’est attesté. Les cases non cochées restent à réaliser, même lorsqu’une partie du contrôle est déjà couverte.

La page 10 du PDF `1789876438454.pdf` fixe le checkpoint en semaine 7, pour 15 % de la note finale, avec six critères totalisant 100 points. Le lundi 5 octobre vient du calendrier du projet, pas du PDF ; l'heure de remise reste à vérifier.

## 1 État et blocages connus

| Élément | État de ce dossier | Ce qui manque avant de le déclarer prêt |
| --- | --- | --- |
| Cahier des charges | Version initiale présente | Revue finale, cohérence avec implémentation et choix documentés |
| Matrice | 90 IDs officiels conservés et preuves actualisées | Conformité finale et éléments « À produire » toujours incomplets |
| Architecture | Données S1, états, ADR et bots documentés ; modèle relu | Course/bots restent des conceptions ; revue finale au changement de périmètre |
| Code du Sprint 1 | Socle compte/invité/salon validé en CI main | Seed S1 traité séparément sous #4 ; recette UI exhaustive, OAuth et production ouverts |
| Nom et logo | **Bloqué sur apport de l'étudiant** | Noms envisagés, vérification d'originalité, nom final, croquis et logo personnel sans IA |
| Direction artistique | Dossier de préparation incomplet | Moodboard 3–5 références, palette/typos finales, chronologie honnête et identité appliquée |
| GitHub OAuth | Non vérifié en production | Configuration sécurisée et vrai aller-retour de connexion HTTPS |
| Discord OAuth | Non vérifié en production | Configuration sécurisée et vrai aller-retour de connexion HTTPS |
| VPS et HTTPS | Déploiement non démontré | Accès autorisé au serveur, domaine/URL, HTTPS, migrations et démonstration publique |
| CI publiée | Main, push et PR finaux verts ; [preuves](verification.md) | Relancer sur toute modification du code ; aucune preuve de déploiement incluse |

Un compte local, une variable d'environnement ou un bouton OAuth ne prouvent pas AUTH-01. Un environnement de développement, un build réussi ou un aperçu ne prouvent pas TECH-05. Les diagrammes de course et de bots satisfont une partie documentaire du checkpoint ; ils ne prouvent pas un moteur de jeu implémenté.

## 2 Grille officielle sur 100 points et preuves attendues

Les poids ci-dessous reprennent la page 10 sans redistribution. Les points sont attribués par l'enseignant ; ce dossier ne fournit pas d'auto-note.

| Critère officiel | Points | Issues de suivi | Pièces et démonstration attendues | État actuel et lacune |
| --- | ---: | --- | --- | --- |
| Cahier des charges | 20 | [#1](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/1) | [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md), acteurs, périmètre, règles, qualité, recette, phases et choix | Version initiale rédigée ; validation de cohérence finale à faire |
| Démarche créative et direction artistique : nom, logo, moodboard, palette, typographies | 20 | [#2](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/2), [#7](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/7) | [DEMARCHE-CREATIVE.md](DEMARCHE-CREATIVE.md), noms personnels, croquis, choix, logo définitif app/favicon, 3–5 références, palette, typographies | **Incomplet et bloqué sur contributions humaines** ; aucune création ni provenance inventée |
| Architecture : modèle de données, machine à états, ADR temps réel | 20 | [#3](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/3), [#4](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/4), [#5](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/5) | [ARCHITECTURE.md](ARCHITECTURE.md), diagramme données, COURSE-01, ADR et approche bots seedée | Conception initiale présente ; vérification finale des liens et correspondance code/DB à faire |
| Déploiement fonctionnel en production : HTTPS, authentification, base de données | 20 | [#4](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/4), [#8](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/8), [#11](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/11) | URL VPS publique HTTPS ; GitHub **et** Discord ; DB réelle et migrations ; commit/version déployée | **Non démontré** ; environnement, configuration et preuves manquants |
| Salle créée et rejointe par code, mise à jour en temps réel | 10 | [#9](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/9), [#10](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/10) | Compte crée, second compte/invité rejoint ; roster synchronisé ; droits et DB sans doublons | Création/entrée/roster/reload/départ prouvés en Chromium et HTTP/SSE sur main ; démonstration publique restant à faire |
| Intégration continue, langue et thème, qualité initiale du code, matrice des exigences | 10 | [#1](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/1), [#6](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/6), [#7](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/7), [#12](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/12) | Run CI du commit ; tests unitaires ; TypeScript strict ; FR/EN et clair/sombre ; [EXIGENCES.md](EXIGENCES.md) exact et honnête | CI main verte, matrice actualisée ; FR→EN et thème sombre/reload prouvés ; langue exhaustive, clair/système et sans-flash à compléter |
| **Total** | **100** | | | **Aucun score revendiqué** |

## 3 Inventaire des livrables à remettre

La liste reprend la section 7.1, page 10, et précise les éléments de réception :

- [ ] `docs/DEMARCHE-CREATIVE.md` complet, pièces jointes réelles, nom et logo définitifs de l'étudiant
- [x] `docs/ARCHITECTURE.md` initial avec diagramme données, machine COURSE-01, ADR temps réel et approche bots
- [ ] Application sur **VPS**, publiquement accessible en **HTTPS** et opérationnelle
- [ ] GitHub et Discord testés réellement en production
- [ ] PostgreSQL et migrations versionnées exécutés sur la cible de production
- [x] Compte authentifié créant une salle, choix participant/spectateur, entrée par code depuis l'accueil et présence temps réel
- [ ] Langue et thème fonctionnels sur toutes les pages existantes
- [ ] Nom/logo, palette et typographies appliqués à l'interface et favicon
- [x] GitHub Actions à chaque push avec lint, types et quelques tests unitaires
- [x] `docs/EXIGENCES.md` recensant les 90 exigences avec leur statut actuel et les limites
- [x] Cahier des charges disponible pour le critère évalué sur 20 points

## 4 Recette de démonstration

Les cases cochées renvoient à [verification.md](verification.md), au run main `80b7a5c` du 3 octobre 2026 et aux tests qui y sont décrits. Elles prouvent ce périmètre local/CI seulement. Les contrôles composés restent ouverts dès qu’un sous-critère manque ; ils ne doivent pas être déduits du seul nombre de tests verts.

### 4.1 Configuration et reproductibilité

- [x] Installation avec lockfile ; version Node/pnpm identifiée
- [ ] `.env.example` complet et sans secret ; valeurs réelles hors Git/logs
- [x] Migrations sur PostgreSQL jetable vide réussies en CI
- [ ] Migration de la cible de production faite sans perte non autorisée
- [ ] Joindre la preuve du seed S1 sûr et idempotent livré séparément sous [#4](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/4) ; corpus/utilisateurs/historique complets restent futurs
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries` et `pnpm test:unit` exécutés sur le commit remis ; intégration et build vérifiés selon les scripts réellement présents
- [x] GitHub Actions reproduit au minimum lint, `tsc --noEmit`, unitaires à **chaque push**, pas seulement sur main/PR
- [ ] Aucun `.js`/`.jsx`, aucun `any` explicite, TypeScript strict ; suppressions de types justifiées

### 4.2 Authentification et invités

- [ ] Ouvrir l'URL publique HTTPS, se connecter par GitHub puis se déconnecter ; recommencer avec Discord
- [ ] Annulation du fournisseur et callback invalide produisent une erreur, sans faux succès
- [x] Requête de création sans session, ou avec invité, refusée côté serveur même en appel direct
- [ ] Invité avec pseudo valide entre 3 et 20 caractères ; pseudo trop court/long refusé
- [ ] Reload retrouve la session signée de l'invité ; cookie falsifié refusé
- [ ] L'invité n'a aucune commande de création/ajout de photo ni historique persistant ; avatar généré visible
- [x] Session expirée/révoquée ne conserve pas des droits par le seul client
- [ ] Si comptes locaux disponibles : inscription et connexion sans secret affiché dans réponse/logs ; mots de passe correctement hachés

### 4.3 Salles et présence

- [x] Session A connectée crée une salle « Sur code », obtient un code de 6 caractères sans `0/O/1/I/L`, devient hôte
- [x] Hôte participant/spectateur et exclusion des spectateurs de la capacité : unitaires/intégration
- [ ] Exercer le sélecteur spectateur dans le navigateur ; le parcours E2E actuel crée un hôte participant
- [x] Session B distincte, invitée ou connectée, rejoint depuis le champ de l'accueil
- [x] A voit le nom de B apparaître et son départ sans reload ; les deux contextes affichent deux membres après reload de B
- [ ] Compléter la recette retour après coupure réseau et vérification nominative du roster dans chaque contexte
- [x] Recharger B : exactement deux membres conservés dans les deux contextes Chromium
- [ ] Ouvrir un deuxième onglet de la même session : aucune adhésion supplémentaire
- [ ] Essayer une autre salle : proposition de quitter l'actuelle ; contrainte DB empêche l'adhésion concurrente
- [ ] Codes invalides, inconnus, salle pleine et état non joignable donnent des erreurs traduites, sans navigation de succès
- [x] Capacité 2–30, spectateurs exclus ; tentatives concurrentes sur dernière place contrôlées par DB
- [ ] Limitation IP des codes démontrée avec le seuil configuré ; aucune confiance aveugle dans un header IP fourni par le client
- [ ] Couper/reprendre le transport : resynchronisation versionnée, pas de duplicate ni d'état client autoritaire
- [ ] Vérifier départ d'hôte et politiques de présence effectivement implémentées ; signaler toute partie restant uniquement conçue

### 4.4 UI et accessibilité

Déjà prouvé en Chromium : FR→EN, titre anglais après reload, thème sombre conservé, aucune `pageerror` sur ce parcours, accueil sans débordement horizontal à 360 × 780 ; erreur login anglaise sans faux succès et régression de réponse initiale retardée. Ces assertions ne suffisent pas à cocher les contrôles exhaustifs suivants.

- [ ] FR/EN sur chaque page existante, y compris erreurs, états vides et métadonnées
- [ ] Premier accès selon langue navigateur, puis choix explicite conservé après navigation/reload
- [ ] Dates et nombres suivent la langue
- [ ] Thème initial selon système, clair/sombre modifiable et conservé, sans flash du mauvais thème
- [ ] À 360 px, aucune action essentielle inaccessible ; vérification des formulaires, page salle et navigation
- [ ] Parcours clavier complet et focus visible ; labels, alt, titres et landmarks corrects
- [ ] Contraste AA du texte dans les deux thèmes
- [ ] Erreur, double clic, rechargement et retour navigateur ne donnent pas de succès fantôme
- [ ] Identité finale fournie par l'étudiant appliquée ; aucun placeholder présenté comme logo ou nom définitif

### 4.5 Production et intégrité de remise

- [ ] URL ouverte depuis un contexte indépendant ; HTTPS valide et aucune alerte navigateur contournée
- [ ] Serveur VPS et forfaits tiers documentés ; aucun service payé imposé à l'enseignant
- [ ] Redémarrage de l'application : état persistant et migration cohérents
- [ ] SSE à travers le proxy : pas de mise en cache/buffering cassant la présence ; reconnexion vérifiée
- [ ] Version déployée correspond au commit remis et au run CI relié
- [ ] Aucun secret de production dans captures, logs, code ou historique ajouté
- [x] Les états de [EXIGENCES.md](EXIGENCES.md) reflètent ces preuves ; tests non exécutés/échecs visibles

## 5 Registre de preuves

Les champs « À fournir » restent manquants. La preuve technique courante porte sur le commit main `80b7a5c2c36b800478f04cd40a3082a0df8f3cbb`, arbre `3b9d277b223442496576c8dcc921972c6380e84a`. Voir [verification.md](verification.md) pour les liens des runs main/push/PR et l’historique conservé. Les ajouts ultérieurs, notamment le seed, ne sont pas couverts par anticipation. Ne jamais mettre de credentials, cookie ou token dans ce registre.

| Référence | Preuve attendue | Commit ou version | Date et résultat | Lien ou pièce |
| --- | --- | --- | --- | --- |
| PREUVE-01 | Revue des documents et décompte 90 IDs | Mise à jour documentaire après 80b7a5c | 03/10/2026 : mêmes 90 IDs, sans ajout ni doublon ; statuts rattachés aux preuves | [EXIGENCES.md](EXIGENCES.md) |
| PREUVE-02 | Nom personnel, croquis/logo, moodboard, palette, typo | À fournir | À fournir | À fournir par l'étudiant |
| PREUVE-03 | Modèle DB/FSM/ADR/bots relus | 80b7a5c | 03/10/2026 : modèle S1 et frontières relus ; FSM/course/bots documentaires, non implémentés | [ARCHITECTURE.md](ARCHITECTURE.md) |
| PREUVE-04 | Lint/types/frontières/unitaires | 80b7a5c | 03/10/2026 : PASS CI ; 23 tests unitaires | [Run main](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37128079856) |
| PREUVE-05 | Migrations et tests PostgreSQL réels | 80b7a5c | 03/10/2026 : PASS 14 intégrations / 9 fichiers ; deux migrations ; replay local antérieur conservé au rapport | [verification.md](verification.md) |
| PREUVE-06 | Build et contrôles navigateur | 80b7a5c | 03/10/2026 : Build PASS ; 4/4 Chromium, sans retry ; portée limitée explicitée | [verification.md](verification.md) |
| PREUVE-07 | Run CI à chaque push | 80b7a5c ; f4799f2 | 03/10/2026 : main terminé 14:02:21 UTC ; push et PR finaux verts | [Run main](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37128079856) ; [autres runs](verification.md) |
| PREUVE-08 | URL VPS HTTPS et version déployée | À fournir | Non attesté ici | À fournir |
| PREUVE-09 | Connexion GitHub réelle en HTTPS | À fournir | Non attesté ici | À fournir |
| PREUVE-10 | Connexion Discord réelle en HTTPS | À fournir | Non attesté ici | À fournir |
| PREUVE-11 | Deux sessions création/entrée/présence | 80b7a5c | 03/10/2026 : PASS HTTP/SSE et Chromium ; inscription locale, invité, création, entrée, reload et départ | [Scénarios exacts](verification.md) |
| PREUVE-12 | FR/EN, thèmes, 360 px, clavier et contrastes | 80b7a5c | PARTIEL : FR→EN et sombre/reload, accueil 360 px PASS ; clavier/AA/système/clair/sans-flash et toutes pages non vérifiés | [Limites navigateur](verification.md) |

## 6 Conditions pour annoncer le checkpoint prêt

La préparation est recevable lorsque les éléments S1 du PDF sont effectivement présents, les blocages levés, la démonstration publique fonctionne et les preuves du commit final sont reliées. Une fonctionnalité incomplète peut être remise avec un statut honnête, mais le dossier ne doit pas annoncer le checkpoint entièrement conforme si une obligation manque.

Le moteur de course, les bots, les bonus et l'historique restent après S1 ; leur conception documentaire n'est pas une dérogation à la finale. Aucune dépense, création de credentials, expansion d'accès ou publication non autorisée n'est impliquée par ce protocole.

## 7 Préparer la suite sans diluer le checkpoint

La finale en semaine 11 comporte une grille distincte (PDF p. 12), sur 100 points : cahier des charges 10, fonctionnalités principales 25, configuration/bots/bonus 10, design 10, qualité de code 15, tests/CI 10, performance/accessibilité 10, documentation/livrables 10. La note du cahier des charges est reprise de celle du checkpoint.

Conserver dès maintenant les vrais incidents d'usage de l'IA, leurs détections et corrections pour les trois exemples exigés dans `docs/IA.md`. Les noms/logo restent la contribution personnelle de l'étudiant ; les exemples d'erreurs et sa réflexion ne doivent pas être inventés. Après la rétroaction, mettre à jour les issues futures et les statuts de la matrice en gardant les mêmes IDs.

## Synthèse de réception au 3 octobre 2026

Le backend S1 et l’UI minimale ont une preuve distante verte : 23 unitaires, 14 intégrations PostgreSQL et 4 scénarios Chromium sur main. Les blocages navigateur locaux de 13 h 23 et les premiers runs CI rouges sont conservés dans l’historique de [verification.md](verification.md), avec leurs correctifs. Les contrôles navigateur précis réussis ne ferment pas la recette clavier/contrastes/mobile complète. OAuth GitHub/Discord, VPS public HTTPS, nom/logo et direction artistique humaine restent ouverts ; la preuve du seed S1 est suivie séparément sous #4.
