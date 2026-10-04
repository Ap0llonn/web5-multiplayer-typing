# Dossier de réception du checkpoint 1

État au 4 octobre 2026, après relecture des deux CI de la référence main · Échéance de travail : **lundi 5 octobre 2026** · Dépôt `Ap0llonn/web5-multiplayer-typing`

Ce dossier organise les preuves du checkpoint ; **il ne déclare pas le Sprint 1 terminé**. Le socle technique est vérifié sur la référence main fusionnée `25fd45a6` : [Quality 37208335041](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37208335041), **58 unitaires, 20 intégrations PostgreSQL et 15 scénarios Chromium**, plus installation/migrations/lint/types/frontières/build/HTTP-SSE. Le workflow indépendant [Local infrastructure 37208335050](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37208335050) valide réellement Docker Compose et la persistance PostgreSQL/Redis/S3. Aucune URL de production fonctionnelle ni callback OAuth réel n’est attesté. Les cases non cochées restent à réaliser, même lorsqu’une partie du contrôle est déjà couverte.

La page 10 du PDF `1789876438454.pdf` fixe le checkpoint en semaine 7, pour 15 % de la note finale, avec six critères totalisant 100 points. Le lundi 5 octobre vient du calendrier du projet, pas du PDF ; l'heure de remise reste à vérifier.

## 1 État et blocages connus

| Élément | État de ce dossier | Ce qui manque avant de le déclarer prêt |
| --- | --- | --- |
| Cahier des charges | Version initiale présente | Revue finale, cohérence avec implémentation et choix documentés |
| Matrice | 90 IDs officiels conservés et preuves actualisées | Conformité finale et éléments « À produire » toujours incomplets |
| Architecture | Données S1, états, ADR et bots documentés ; modèle relu | Course/bots restent des conceptions ; revue finale au changement de périmètre |
| Code du Sprint 1 | Socle compte/invité/salon validé en CI main | Seed S1 fusionné et testé ; recette UI automatisée élargie ; vérifications exhaustives, OAuth et production ouverts |
| Nom et logo | PNG CLAK! appliqué à la navigation et au footer | Provenance personnelle sans IA, noms envisagés, originalité, choix définitif, croquis et favicon non vérifiés |
| Direction artistique | Présentation arcade, palette et piles typographiques documentées | Moodboard sourcé de 3–5 références, justifications personnelles et réception finale incomplets ; chronologie réelle conservée |
| GitHub OAuth | Non vérifié en production | Configuration sécurisée et vrai aller-retour de connexion HTTPS |
| Discord OAuth | Non vérifié en production | Configuration sécurisée et vrai aller-retour de connexion HTTPS |
| VPS et HTTPS | Déploiement non démontré | Accès autorisé au serveur, domaine/URL, HTTPS, migrations et démonstration publique |
| CI publiée | Deux workflows verts sur la référence main 25fd45a6 ; [preuves](verification.md) | Relancer sur toute modification du code ; aucune preuve de déploiement incluse |

Un compte local, une variable d'environnement ou un bouton OAuth ne prouvent pas AUTH-01. Un environnement de développement, un build réussi ou un aperçu ne prouvent pas TECH-05. Les diagrammes de course et de bots satisfont une partie documentaire du checkpoint ; ils ne prouvent pas un moteur de jeu implémenté.

## 2 Grille officielle sur 100 points et preuves attendues

Les poids ci-dessous reprennent la page 10 sans redistribution. Les points sont attribués par l'enseignant ; ce dossier ne fournit pas d'auto-note.

| Critère officiel | Points | Issues de suivi | Pièces et démonstration attendues | État actuel et lacune |
| --- | ---: | --- | --- | --- |
| Cahier des charges | 20 | [#1](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/1) | [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md), acteurs, périmètre, règles, qualité, recette, phases et choix | Version initiale rédigée ; validation de cohérence finale à faire |
| Démarche créative et direction artistique : nom, logo, moodboard, palette, typographies | 20 | [#2](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/2), [#7](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/7) | [DEMARCHE-CREATIVE.md](DEMARCHE-CREATIVE.md), noms personnels, croquis, choix, logo définitif app/favicon, 3–5 références, palette, typographies | **Partiel** : PNG CLAK!, palette et piles typographiques appliqués ; moodboard, croquis, provenance personnelle sans IA, originalité, statut définitif et favicon non vérifiés |
| Architecture : modèle de données, machine à états, ADR temps réel | 20 | [#3](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/3), [#4](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/4), [#5](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/5) | [ARCHITECTURE.md](ARCHITECTURE.md), diagramme données, COURSE-01, ADR et approche bots seedée | Conception initiale présente ; vérification finale des liens et correspondance code/DB à faire |
| Déploiement fonctionnel en production : HTTPS, authentification, base de données | 20 | [#4](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/4), [#8](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/8), [#11](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/11) | URL VPS publique HTTPS ; GitHub **et** Discord ; DB réelle et migrations ; commit/version déployée | **Non démontré** ; environnement, configuration et preuves manquants |
| Salle créée et rejointe par code, mise à jour en temps réel | 10 | [#9](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/9), [#10](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/10) | Compte crée, second compte/invité rejoint ; roster synchronisé ; droits et DB sans doublons | Création/entrée, roster nominatif et libellés, hôte spectateur, reconnexion hôte/invité et conflit entre onglets prouvés en CI ; démonstration publique restant à faire |
| Intégration continue, langue et thème, qualité initiale du code, matrice des exigences | 10 | [#1](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/1), [#6](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/6), [#7](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/7), [#12](https://github.com/Ap0llonn/web5-multiplayer-typing/issues/12) | Run CI du commit ; tests unitaires ; TypeScript strict ; FR/EN et clair/sombre ; [EXIGENCES.md](EXIGENCES.md) exact et honnête | Deux CI de référence vertes, matrice actualisée ; choix de langue prioritaire, thèmes système/explicites, 360 px, clavier ciblé et axe vérifiés ; premier paint sans flash et recette exhaustive ouverts |
| **Total** | **100** | | | **Aucun score revendiqué** |

## 3 Inventaire des livrables à remettre

La liste reprend la section 7.1, page 10, et précise les éléments de réception :

- [ ] `docs/DEMARCHE-CREATIVE.md` complet, pièces jointes réelles, nom et logo définitifs de l'étudiant
- [x] `docs/ARCHITECTURE.md` initial avec diagramme données, machine COURSE-01, ADR temps réel et approche bots
- [ ] Application sur **VPS**, publiquement accessible en **HTTPS** et opérationnelle
- [ ] GitHub et Discord testés réellement en production
- [ ] PostgreSQL et migrations versionnées exécutés sur la cible de production
- [x] Compte authentifié créant une salle, choix participant/spectateur, entrée par code depuis l'accueil et présence temps réel
- [x] Préférences langue/thème et contrôles des pages S1 parcourues vérifiés en Chromium ; périmètre exact en §4.4
- [ ] Revue exhaustive des textes/états et absence de flash au premier paint
- [x] PNG CLAK! fourni, palette et piles typographiques appliqués à l’interface S1
- [ ] Provenance personnelle, identité définitive et favicon validés
- [x] GitHub Actions à chaque push avec lint, types et quelques tests unitaires
- [x] `docs/EXIGENCES.md` recensant les 90 exigences avec leur statut actuel et les limites
- [x] Cahier des charges disponible pour le critère évalué sur 20 points

## 4 Recette de démonstration

Les cases cochées renvoient à [verification.md](verification.md), aux deux runs de la référence main `25fd45a6` du 4 octobre 2026 et aux tests qui y sont décrits. Elles prouvent ce périmètre local/CI seulement. Les contrôles composés restent ouverts dès qu’un sous-critère manque ; ils ne doivent pas être déduits du seul nombre de tests verts.

### 4.1 Configuration et reproductibilité

- [x] Installation avec lockfile ; version Node/pnpm identifiée
- [x] `.env.example` relu : exemples locaux identifiés, secret auth et paires OAuth non renseignés ; guide local associé
- [ ] Vérifier les valeurs réelles et leur absence des captures/logs lors de la recette production
- [x] Migrations sur PostgreSQL jetable vide réussies en CI
- [ ] Migration de la cible de production faite sans perte non autorisée
- [x] Seed S1 fusionné : 3 tests PostgreSQL sur répétition/concurrence, rollback et cibles refusées ; deux utilisateurs synthétiques sans credentials et salle fermée inactive
- [ ] Corpus, jeu de données final et historique de course complets ; le seed S1 ne les fournit pas
- [x] Docker Compose réellement validé ; PostgreSQL/Redis/S3 et persistance après down/up testés par le workflow indépendant Local infrastructure
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries` et `pnpm test:unit` exécutés sur le commit remis ; intégration et build vérifiés selon les scripts réellement présents
- [x] GitHub Actions reproduit au minimum lint, `tsc --noEmit`, unitaires à **chaque push**, pas seulement sur main/PR
- [x] Arbre versionné sans `.js`/`.jsx`, strict=true et no-explicit-any en erreur ; lint vert et deux `@ts-expect-error` de tests justifiés par commentaire

### 4.2 Authentification et invités

- [ ] Ouvrir l'URL publique HTTPS, se connecter par GitHub puis se déconnecter ; recommencer avec Discord
- [ ] Annulation du fournisseur et callback invalide produisent une erreur, sans faux succès
- [x] Requête de création sans session, ou avec invité, refusée côté serveur même en appel direct
- [x] Invité : pseudo choisi, vraie session puis entrée/reload dans Chromium ; intégration refusant pseudo absent/trop court
- [ ] Ajouter une assertion d’intégration sur le pseudo trop long ; borne haute 20 présente dans le schéma
- [x] Reload retrouve la session invitée et la même adhésion dans Chromium
- [ ] Démontrer explicitement le refus d’un cookie falsifié
- [ ] L'invité n'a aucune commande de création/ajout de photo ni historique persistant ; avatar généré visible
- [x] Session expirée/révoquée ne conserve pas des droits par le seul client
- [ ] Si comptes locaux disponibles : inscription et connexion sans secret affiché dans réponse/logs ; mots de passe correctement hachés

### 4.3 Salles et présence

- [x] Session A connectée crée une salle « Sur code », obtient un code de 6 caractères sans `0/O/1/I/L`, devient hôte
- [x] Hôte participant/spectateur et exclusion des spectateurs de la capacité : unitaires/intégration
- [x] Sélecteur spectateur exercé en Chromium FR/EN ; hôte spectateur et deux participants pour une capacité de 2
- [x] Session B distincte, invitée ou connectée, rejoint depuis le champ de l'accueil
- [x] A voit le nom de B apparaître et son départ sans reload ; les deux contextes affichent deux membres après reload de B
- [x] Roster nominatif avec libellés compte/invité/hôte ; réseau coupé puis rétabli successivement pour invité et hôte, retour sous 30 s avec identités et hôte inchangés
- [x] Recharger B : exactement deux membres conservés dans les deux contextes Chromium
- [x] Même session dans deux onglets : récupération de la salle, puis deux membres dans les trois vues après départ/entrée explicites et reload
- [x] Onglet périmé visant une autre salle : conflit, restauration de la salle réelle et action Quitter explicite ; aucun départ/entrée automatique, unicité DB conservée
- [x] Codes invalides/inconnus, salle pleine et salle fermée : erreurs FR/EN dans Chromium, aucune salle ni navigation de faux succès
- [ ] Autres états non joignables d’une course à exercer dans le navigateur quand le moteur sera réalisé
- [x] Capacité 2–30, spectateurs exclus ; tentatives concurrentes sur dernière place contrôlées par DB
- [ ] Limitation IP des codes : démontrer seuil et concurrence, puis configuration du proxy de confiance ; le test de limite du login ne couvre pas les codes
- [x] Coupure/reprise réseau des deux acteurs dans Chromium sans doublon ni changement d’identité ; ordre des snapshots couvert en unitaire
- [ ] Reproduire la reconnexion à travers le proxy VPS réel
- [x] Départ de l’hôte spectateur ferme la salle sans autre compte (Chromium FR/EN) ; transfert/expiration et lecture sans renouvellement de présence couverts côté serveur
- [ ] Démontrer le transfert à un autre compte dans le navigateur et sur la cible publique

### 4.4 UI et accessibilité

Déjà prouvé par `ui-acceptance.spec.ts`, `sprint.spec.ts`, `lobby-acceptance.spec.ts` et `presence.spec.ts` : les contrôles suivants sur les états parcourus. Les sous-critères exhaustifs restent séparés des assertions automatisées ; voir [la portée exacte](verification.md).

- [x] Titres et formulaires des pages S1 en FR/EN ; erreurs d’entrée invalides/inconnues/pleines/fermées en FR/EN et erreur login EN ; libellés compte/invité du roster dans les deux langues
- [ ] Inventaire exhaustif des chaînes, erreurs, états vides et métadonnées de chaque page
- [x] Premier accès `en-US`→EN, repli `es-ES`→FR ; choix explicite FR conservé après reload, nouvelle entrée `/` et navigation accueil/login/signup ; query/fragment conservés au changement de langue
- [ ] Dates et nombres suivent la langue
- [x] Thèmes système clair/sombre et choix explicites persistants sur les pages parcourues
- [x] Bootstrap SSR : thème système et priorité des choix clair/sombre couverts ; absence d’avertissement React ciblé vérifiée lors du changement de langue
- [ ] Absence de flash du mauvais thème au premier paint ; ni bootstrap unitaire ni assertions après `DOMContentLoaded` ne constituent une mesure visuelle
- [x] À 360 × 780, accueil/login/signup, formulaire de création et salon sans débordement en FR/EN × clair/sombre ; nom de salle de 60 caractères vérifié
- [ ] Revue visuelle mobile et tous les états/actions essentiels, au-delà des pages/états automatisés
- [x] Inscription au clavier via lien d’évitement et Tab/Entrée, assertions de focus et outline du champ identifiant ; départ au clavier depuis le bouton focalisé
- [ ] Tous les parcours au clavier et qualité visuelle du focus ; la création du scénario clavier utilise encore fill/click
- [x] Analyses axe WCAG 2 A/AA et 2.1 A/AA sans violation sur les états parcourus dans les deux thèmes/langues ; contrôles automatisés de contraste inclus
- [ ] Audit manuel WCAG/technologies d’assistance, tous les états de contraste et qualité des alternatives/labels ; aucun certificat exhaustif déduit d’axe
- [x] Mauvais login, réponse `/me` retardée, conflit d’onglet, reload et erreurs de join testés sans faux succès
- [ ] Login local positif dans le navigateur, Retour/Avancer et tous les cas de double clic/interruption
- [x] PNG CLAK! chargé dans la navigation/footer ; liens du footer, navigation après inscription/déconnexion et changement de langue testés
- [ ] Création personnelle sans IA, originalité, croquis, statut définitif et favicon attestés par l’étudiant

### 4.5 Production et intégrité de remise

- [ ] URL ouverte depuis un contexte indépendant ; HTTPS valide et aucune alerte navigateur contournée
- [ ] Serveur VPS et forfaits tiers documentés ; aucun service payé imposé à l'enseignant
- [ ] Redémarrage de l'application : état persistant et migration cohérents
- [ ] SSE à travers le proxy : pas de mise en cache/buffering cassant la présence ; reconnexion vérifiée
- [ ] Version déployée correspond au commit remis et au run CI relié
- [ ] Aucun secret de production dans captures, logs, code ou historique ajouté
- [x] Les états de [EXIGENCES.md](EXIGENCES.md) reflètent ces preuves ; tests non exécutés/échecs visibles

## 5 Registre de preuves

Les champs « À fournir » restent manquants. La preuve technique courante porte sur la référence main `25fd45a6d2b019c95f14043e92f319336b217613`, arbre `386f83caec39757f47527001b4084fa0b2e580b0`. Les métadonnées, états de jobs et journaux des deux runs ont été relus le 4 octobre 2026. Voir [verification.md](verification.md) pour les assertions et l’historique ; aucun ajout ultérieur n’est compté par anticipation. Ne jamais mettre de credentials, cookie ou token dans ce registre.

| Référence | Preuve attendue | Commit ou version | Date et résultat | Lien ou pièce |
| --- | --- | --- | --- | --- |
| PREUVE-01 | Revue des documents et décompte 90 IDs | Mise à jour documentaire depuis 25fd45a6 | 04/10/2026 : mêmes 90 IDs, sans ajout ni doublon ; exigences et sous-critères conservés | [EXIGENCES.md](EXIGENCES.md) |
| PREUVE-02 | Nom personnel, croquis/logo, moodboard, palette, typo | 25fd45a6 | PARTIEL : PNG CLAK! appliqué, palette et piles typographiques décrites ; provenance sans IA, originalité, croquis, moodboard et favicon ouverts | [Démarche créative](DEMARCHE-CREATIVE.md) |
| PREUVE-03 | Modèle DB/FSM/ADR/bots relus | 25fd45a6 | 04/10/2026 : architecture et règles de présence relues ; FSM/course/bots documentaires, non implémentés | [ARCHITECTURE.md](ARCHITECTURE.md) |
| PREUVE-04 | Lint/types/frontières/unitaires | 25fd45a6 | 04/10/2026 : PASS Quality ; 58 unitaires / 16 fichiers | [Quality](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37208335041) |
| PREUVE-05 | Migrations et tests PostgreSQL réels | 25fd45a6 | 04/10/2026 : PASS 20 intégrations / 11 fichiers, dont 3 tests seed ; deux migrations sur DB jetable | [verification.md](verification.md) |
| PREUVE-06 | Build et contrôles navigateur | 25fd45a6 | 04/10/2026 : build PASS ; 15/15 Chromium / 4 fichiers, aucun retry | [Scénarios exacts](verification.md) |
| PREUVE-07 | Run CI à chaque push | 25fd45a6 | 04/10/2026 : jobs Quality et Local infrastructure terminés avec succès ; deux workflows push/PR sans filtre de branche | [Quality](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37208335041) ; [Local infrastructure](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37208335050) |
| PREUVE-08 | URL VPS HTTPS et version déployée | À fournir | Non attesté ici | À fournir |
| PREUVE-09 | Connexion GitHub réelle en HTTPS | À fournir | Non attesté ici | À fournir |
| PREUVE-10 | Connexion Discord réelle en HTTPS | À fournir | Non attesté ici | À fournir |
| PREUVE-11 | Sessions, onglets, création/entrée/présence | 25fd45a6 | 04/10/2026 : PASS HTTP/SSE et Chromium ; hôte spectateur, roster nominatif, reconnexion hôte/invité, conflit et départ explicite sans doublon | [Scénarios exacts](verification.md) |
| PREUVE-12 | FR/EN, thèmes, 360 px, clavier et contrastes | 25fd45a6 | PARTIEL : préférences/pages, largeur 360 px, clavier ciblé et axe dans les deux langues/thèmes PASS ; premier paint et audits exhaustifs ouverts | [Limites navigateur](verification.md) |
| PREUVE-13 | Infrastructure locale Docker Compose | 25fd45a6 | 04/10/2026 : PASS configuration réelle, PostgreSQL/Redis/S3, PNG signé/refus anonyme et persistance down/up ; pas preuve de production | [Local infrastructure](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37208335050) |

## 6 Conditions pour annoncer le checkpoint prêt

La préparation est recevable lorsque les éléments S1 du PDF sont effectivement présents, les blocages levés, la démonstration publique fonctionne et les preuves du commit final sont reliées. Une fonctionnalité incomplète peut être remise avec un statut honnête, mais le dossier ne doit pas annoncer le checkpoint entièrement conforme si une obligation manque.

Le moteur de course, les bots, les bonus et l'historique restent après S1 ; leur conception documentaire n'est pas une dérogation à la finale. Aucune dépense, création de credentials, expansion d'accès ou publication non autorisée n'est impliquée par ce protocole.

## 7 Préparer la suite sans diluer le checkpoint

La finale en semaine 11 comporte une grille distincte (PDF p. 12), sur 100 points : cahier des charges 10, fonctionnalités principales 25, configuration/bots/bonus 10, design 10, qualité de code 15, tests/CI 10, performance/accessibilité 10, documentation/livrables 10. La note du cahier des charges est reprise de celle du checkpoint.

Conserver dès maintenant les vrais incidents d'usage de l'IA, leurs détections et corrections pour les trois exemples exigés dans `docs/IA.md`. Les noms/logo restent la contribution personnelle de l'étudiant ; les exemples d'erreurs et sa réflexion ne doivent pas être inventés. Après la rétroaction, mettre à jour les issues futures et les statuts de la matrice en gardant les mêmes IDs.

## Synthèse de réception au 4 octobre 2026

Le backend S1 et la présentation rétro arcade ont une preuve distante verte sur `25fd45a6` : **58 unitaires, 20 intégrations PostgreSQL et 15 scénarios Chromium**. Le seed S1, les libellés/reconnexions du roster, le conflit d’onglet avec départ explicite, les préférences, 360 px, clavier ciblé et axe sont inclus. Le workflow indépendant Docker Compose vérifie les services locaux et leur persistance. L’historique des anciens blocages et échecs reste dans [verification.md](verification.md). Le PNG CLAK!, la palette et les piles typographiques sont appliqués. OAuth GitHub/Discord réel, VPS public HTTPS, pièces de création personnelle/identité définitive, moodboard/favicon, absence de flash initial et recette exhaustive restent ouverts ; ces résultats ne clôturent pas l’ensemble du Sprint 1.

Le rapport local Windows conserve trois échecs du harnais seed (`spawn pnpm ENOENT`, 17/20 intégrations) ; les 20/20 Linux ne les corrigent pas. Les trois tests supplémentaires de limite IP de PR39 restent hors de cette référence main.
