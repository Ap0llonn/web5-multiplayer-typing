# Dossier de réception du checkpoint 1

État initial au 3 octobre 2026 · Échéance de travail : **lundi 5 octobre 2026** · Dépôt `Ap0llonn/web5-multiplayer-typing`

Ce dossier organise les preuves du checkpoint ; **il ne déclare pas le Sprint 1 terminé**. La documentation et le code sont en préparation. Aucune URL de production fonctionnelle, aucun callback OAuth réel et aucun run CI du commit de remise ne sont attestés dans cette version. Les cases non cochées sont des contrôles à réaliser.

La page 10 du PDF `1789876438454.pdf` fixe le checkpoint en semaine 7, pour 15 % de la note finale, avec six critères totalisant 100 points. Le lundi 5 octobre vient du calendrier du projet, pas du PDF ; l'heure de remise reste à vérifier.

## 1 État et blocages connus

| Élément | État de ce dossier | Ce qui manque avant de le déclarer prêt |
| --- | --- | --- |
| Cahier des charges | Version initiale présente | Revue finale, cohérence avec implémentation et choix documentés |
| Matrice | 90 IDs officiels recensés | Mise à jour par preuves du commit remis ; tous les « À produire » restent incomplets |
| Architecture | Version initiale présente | Revue modèle/états/ADR/bots et correspondance avec schéma/contrats réels |
| Code du Sprint 1 | En développement ; pas de certification ici | Résultats des commandes de contrôle et tests des parcours réels |
| Nom et logo | **Bloqué sur apport de l'étudiant** | Noms envisagés, vérification d'originalité, nom final, croquis et logo personnel sans IA |
| Direction artistique | Dossier de préparation incomplet | Moodboard 3–5 références, palette/typos finales, chronologie honnête et identité appliquée |
| GitHub OAuth | Non vérifié en production | Configuration sécurisée et vrai aller-retour de connexion HTTPS |
| Discord OAuth | Non vérifié en production | Configuration sécurisée et vrai aller-retour de connexion HTTPS |
| VPS et HTTPS | Déploiement non démontré | Accès autorisé au serveur, domaine/URL, HTTPS, migrations et démonstration publique |
| CI publiée | Non vérifiée pour le commit de remise | Lien vers run GitHub Actions exécuté à chaque push et contrôles verts |

Un compte local, une variable d'environnement ou un bouton OAuth ne prouvent pas AUTH-01. Un environnement de développement, un build réussi ou un aperçu ne prouvent pas TECH-05. Les diagrammes de course et de bots satisfont une partie documentaire du checkpoint ; ils ne prouvent pas un moteur de jeu implémenté.

## 2 Grille officielle sur 100 points et preuves attendues

Les poids ci-dessous reprennent la page 10 sans redistribution. Les points sont attribués par l'enseignant ; ce dossier ne fournit pas d'auto-note.

| Critère officiel | Points | Issues de suivi | Pièces et démonstration attendues | État actuel et lacune |
| --- | ---: | --- | --- | --- |
| Cahier des charges | 20 | [#1](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/1) | [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md), acteurs, périmètre, règles, qualité, recette, phases et choix | Version initiale rédigée ; validation de cohérence finale à faire |
| Démarche créative et direction artistique : nom, logo, moodboard, palette, typographies | 20 | [#2](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/2), [#7](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/7) | [DEMARCHE-CREATIVE.md](DEMARCHE-CREATIVE.md), noms personnels, croquis, choix, logo définitif app/favicon, 3–5 références, palette, typographies | **Incomplet et bloqué sur contributions humaines** ; aucune création ni provenance inventée |
| Architecture : modèle de données, machine à états, ADR temps réel | 20 | [#3](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/3), [#4](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/4), [#5](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/5) | [ARCHITECTURE.md](ARCHITECTURE.md), diagramme données, COURSE-01, ADR et approche bots seedée | Conception initiale présente ; vérification finale des liens et correspondance code/DB à faire |
| Déploiement fonctionnel en production : HTTPS, authentification, base de données | 20 | [#4](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/4), [#8](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/8), [#11](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/11) | URL VPS publique HTTPS ; GitHub **et** Discord ; DB réelle et migrations ; commit/version déployée | **Non démontré** ; environnement, configuration et preuves manquants |
| Salle créée et rejointe par code, mise à jour en temps réel | 10 | [#9](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/9), [#10](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/10) | Compte crée, second compte/invité rejoint ; roster synchronisé ; droits et DB sans doublons | Code en développement ; scénario à deux sessions et preuves réseau/DB à produire |
| Intégration continue, langue et thème, qualité initiale du code, matrice des exigences | 10 | [#1](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/1), [#6](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/6), [#7](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/7), [#12](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/12) | Run CI du commit ; tests unitaires ; TypeScript strict ; FR/EN et clair/sombre ; [EXIGENCES.md](EXIGENCES.md) exact et honnête | Matrice préparée ; exécution et contrôles UI/CI à vérifier |
| **Total** | **100** | | | **Aucun score revendiqué** |

## 3 Inventaire des livrables à remettre

La liste reprend la section 7.1, page 10, et précise les éléments de réception :

- [ ] `docs/DEMARCHE-CREATIVE.md` complet, pièces jointes réelles, nom et logo définitifs de l'étudiant
- [ ] `docs/ARCHITECTURE.md` initial avec diagramme données, machine COURSE-01, ADR temps réel et approche bots
- [ ] Application sur **VPS**, publiquement accessible en **HTTPS** et opérationnelle
- [ ] GitHub et Discord testés réellement en production
- [ ] PostgreSQL et migrations versionnées exécutés sur la cible de production
- [ ] Compte authentifié créant une salle, choix participant/spectateur, entrée par code depuis l'accueil et présence temps réel
- [ ] Langue et thème fonctionnels sur toutes les pages existantes
- [ ] Nom/logo, palette et typographies appliqués à l'interface et favicon
- [ ] GitHub Actions à chaque push avec lint, types et quelques tests unitaires
- [ ] `docs/EXIGENCES.md` recensant les 90 exigences avec leur statut actuel et les limites
- [ ] Cahier des charges disponible pour le critère évalué sur 20 points

## 4 Recette de démonstration

Les actions ci-dessous sont un protocole **à exécuter**. Une case cochée doit renvoyer à une preuve datée du commit, jamais seulement à un fichier source.

### 4.1 Configuration et reproductibilité

- [ ] Installation avec lockfile ; version Node/pnpm identifiée
- [ ] `.env.example` complet et sans secret ; valeurs réelles hors Git/logs
- [ ] Migration d'une base PostgreSQL de test vide réussie ; migration de la cible faite sans perte non autorisée
- [ ] Seed initial relançable et périmètre honnête : corpus/utilisateurs/historique complets restent à suivre si entités futures absentes
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries` et `pnpm test:unit` exécutés sur le commit remis ; intégration et build vérifiés selon les scripts réellement présents
- [ ] GitHub Actions reproduit au minimum lint, `tsc --noEmit`, unitaires à **chaque push**, pas seulement sur main/PR
- [ ] Aucun `.js`/`.jsx`, aucun `any` explicite, TypeScript strict ; suppressions de types justifiées

### 4.2 Authentification et invités

- [ ] Ouvrir l'URL publique HTTPS, se connecter par GitHub puis se déconnecter ; recommencer avec Discord
- [ ] Annulation du fournisseur et callback invalide produisent une erreur, sans faux succès
- [ ] Requête de création sans session, ou avec invité, refusée côté serveur même en appel direct
- [ ] Invité avec pseudo valide entre 3 et 20 caractères ; pseudo trop court/long refusé
- [ ] Reload retrouve la session signée de l'invité ; cookie falsifié refusé
- [ ] L'invité n'a aucune commande de création/ajout de photo ni historique persistant ; avatar généré visible
- [ ] Session expirée/révoquée ne conserve pas des droits par le seul client
- [ ] Si comptes locaux disponibles : inscription et connexion sans secret affiché dans réponse/logs ; mots de passe correctement hachés

### 4.3 Salles et présence

- [ ] Session A connectée crée une salle « Sur code », obtient un code de 6 caractères sans `0/O/1/I/L`, devient hôte
- [ ] Vérifier le choix hôte participant ou spectateur ; ce dernier ne compte pas dans la capacité
- [ ] Session B distincte, invitée ou connectée, rejoint depuis le champ de l'accueil
- [ ] A voit B et B voit A sans actualisation manuelle ; départ/retour change le roster correctement
- [ ] Recharger B et ouvrir un deuxième onglet : même identité, aucune adhésion supplémentaire
- [ ] Essayer une autre salle : proposition de quitter l'actuelle ; contrainte DB empêche l'adhésion concurrente
- [ ] Codes invalides, inconnus, salle pleine et état non joignable donnent des erreurs traduites, sans navigation de succès
- [ ] Capacité 2–30, spectateurs exclus ; tentatives concurrentes sur dernière place contrôlées par DB
- [ ] Limitation IP des codes démontrée avec le seuil configuré ; aucune confiance aveugle dans un header IP fourni par le client
- [ ] Couper/reprendre le transport : resynchronisation versionnée, pas de duplicate ni d'état client autoritaire
- [ ] Vérifier départ d'hôte et politiques de présence effectivement implémentées ; signaler toute partie restant uniquement conçue

### 4.4 UI et accessibilité

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
- [ ] Les états de [EXIGENCES.md](EXIGENCES.md) reflètent ces preuves ; tests non exécutés/échecs visibles

## 5 Registre de preuves à remplir

Les champs « À fournir » restent manquants. Le code local vérifié est `77bf8f0` ; voir [verification.md](verification.md). Remplacer la ligne au fur et à mesure, avec lien vers fichier/rapport ou service effectivement consultable par le lecteur autorisé. Ne jamais mettre de credentials, cookie ou token dans ce registre.

| Référence | Preuve attendue | Commit ou version | Date et résultat | Lien ou pièce |
| --- | --- | --- | --- | --- |
| PREUVE-01 | Revue des documents et décompte 90 IDs | 77bf8f0 | 03/10/2026 : 90 IDs officiels présents ; relus | [EXIGENCES.md](EXIGENCES.md) |
| PREUVE-02 | Nom personnel, croquis/logo, moodboard, palette, typo | À fournir | À fournir | À fournir par l'étudiant |
| PREUVE-03 | Modèle DB/FSM/ADR/bots relus | 77bf8f0 | 03/10/2026 : Modèle/FSM/ADR/bots documentés ; revue indépendante en attente | [ARCHITECTURE.md](ARCHITECTURE.md) |
| PREUVE-04 | Lint/types/frontières/unitaires | 77bf8f0 | 03/10/2026 : PASS lint/types/frontières ; 19 tests unitaires | [verification.md](verification.md) |
| PREUVE-05 | Migrations et tests PostgreSQL réels | 77bf8f0 | 03/10/2026 : PASS 11 intégrations PostgreSQL ; deux migrations et replay | [verification.md](verification.md) |
| PREUVE-06 | Build et contrôles navigateur | 77bf8f0 | 03/10/2026 : Build PASS ; navigateur BLOQUÉ par environnement | [verification.md](verification.md) |
| PREUVE-07 | Run CI à chaque push | À fournir | Non attesté ici | À fournir |
| PREUVE-08 | URL VPS HTTPS et version déployée | À fournir | Non attesté ici | À fournir |
| PREUVE-09 | Connexion GitHub réelle en HTTPS | À fournir | Non attesté ici | À fournir |
| PREUVE-10 | Connexion Discord réelle en HTTPS | À fournir | Non attesté ici | À fournir |
| PREUVE-11 | Deux sessions création/entrée/présence | 77bf8f0 | 03/10/2026 : PASS HTTP/SSE avec deux sessions ; UI non vérifiée | [verification.md](verification.md) |
| PREUVE-12 | FR/EN, thèmes, 360 px, clavier et contrastes | À fournir | Non attesté ici | À fournir |

## 6 Conditions pour annoncer le checkpoint prêt

La préparation est recevable lorsque les éléments S1 du PDF sont effectivement présents, les blocages levés, la démonstration publique fonctionne et les preuves du commit final sont reliées. Une fonctionnalité incomplète peut être remise avec un statut honnête, mais le dossier ne doit pas annoncer le checkpoint entièrement conforme si une obligation manque.

Le moteur de course, les bots, les bonus et l'historique restent après S1 ; leur conception documentaire n'est pas une dérogation à la finale. Aucune dépense, création de credentials, expansion d'accès ou publication non autorisée n'est impliquée par ce protocole.

## 7 Préparer la suite sans diluer le checkpoint

La finale en semaine 11 comporte une grille distincte (PDF p. 12), sur 100 points : cahier des charges 10, fonctionnalités principales 25, configuration/bots/bonus 10, design 10, qualité de code 15, tests/CI 10, performance/accessibilité 10, documentation/livrables 10. La note du cahier des charges est reprise de celle du checkpoint.

Conserver dès maintenant les vrais incidents d'usage de l'IA, leurs détections et corrections pour les trois exemples exigés dans `docs/IA.md`. Les noms/logo restent la contribution personnelle de l'étudiant ; les exemples d'erreurs et sa réflexion ne doivent pas être inventés. Après la rétroaction, mettre à jour les issues futures et les statuts de la matrice en gardant les mêmes IDs.

## Vérification locale du 3 octobre 2026

Le backend S1 et l’UI minimale sont présents. Suite locale verte : 19 unitaires, 11 intégrations, build et smoke HTTP/SSE. Les cases de recette navigateur restent ouvertes faute de navigateur accessible ; HTTP ne les remplace pas. OAuth GitHub/Discord, VPS public HTTPS, CI distante, nom/logo et direction artistique humaine restent non validés.
