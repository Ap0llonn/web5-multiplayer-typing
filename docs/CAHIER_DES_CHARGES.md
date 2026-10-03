# Cahier des charges de la course de frappe multijoueur

Version initiale du 3 octobre 2026 · Dépôt `Ap0llonn/web5-multiplayer-typing` · Checkpoint 1 visé le **lundi 5 octobre 2026**

Ce document fixe le produit attendu, le périmètre du premier sprint et les critères de réception. Il décrit une cible de réalisation ; il ne certifie ni une fonctionnalité opérationnelle ni un déploiement. La [matrice des exigences](EXIGENCES.md) distingue l'état constaté des travaux prévus. Le [dossier du checkpoint](CHECKPOINT_1.md) rassemble les preuves à produire.

## 1 Sources et ordre de priorité

La référence normative est le PDF fourni, **Web V — Travail de session — Course de frappe multijoueur en temps réel**, fichier `1789876438454.pdf`, 12 pages. Les pages citées correspondent à la pagination imprimée. Ses 90 exigences identifiées sont toutes reprises dans [EXIGENCES.md](EXIGENCES.md). Ses obligations non identifiées, ses définitions de calcul et ses livrables font aussi partie du périmètre.

Le PDF fixe le checkpoint en semaine 7, pour 15 % de la note finale, puis la remise finale en semaine 11, pour 30 %. Le **5 octobre 2026** est l'échéance de travail communiquée pour ce projet, et non une date imprimée dans le PDF. L'heure de remise et la date civile de la finale restent à confirmer dans les consignes du cours.

En cas de divergence, le PDF transmis prime sur le pitch et les propositions techniques antérieures. Les choix de réalisation respectent ensuite la direction approuvée : backend d'abord, interface initiale simple et architecture de monolithe modulaire inspirée de Type, avec frontières strictes. Les documents historiques sous `docs/superpowers/` conservent la trace d'une proposition antérieure et ne redéfinissent pas ces exigences.

| Sujet | Règle retenue après lecture du PDF |
| --- | --- |
| Invités | Rejoignent une salle ; ne peuvent pas en créer ; aucun historique persistant ni photo personnelle |
| Capacité | De 2 à 30 participants, bots compris ; spectateurs hors capacité |
| Authentification du checkpoint | GitHub **et** Discord opérationnels ; un parcours local ne les remplace pas |
| Hébergement | Application fonctionnelle sur serveur VPS, URL publique HTTPS, dès le checkpoint |
| Bots | Conception dès le checkpoint ; moteur déterministe par seed, à vitesse variable, implémenté après Sprint 1 |
| Début de course | Au moins 2 participants dont au moins 1 humain ; une course uniquement entre bots n'est pas conforme |
| Partie rapide | Proposer la création au compte quand aucune salle ne convient ; ne pas créer automatiquement ; état vide pour l'invité |
| Bonus | Retard et checkpoints conformes à BONUS-01 ; aucun seuil de 50 % issu du pitch ne le remplace |
| Identité visuelle | Nom et logo conçus par l'étudiant **sans IA**, définitifs au checkpoint |

## 2 Finalité et personnes concernées

L'application permet aux étudiants des cohortes plus jeunes de pratiquer la frappe au clavier en affrontant d'autres personnes sur le même texte. Une salle rassemble les personnes, la configuration et plusieurs courses successives. Pendant une course, une piste représente la progression ; des bots de niveaux différents complètent le groupe et des bonus peuvent aider les retardataires.

Le travail est individuel. L'étudiant reste responsable du code, des décisions, des livrables et de leur exactitude, même lorsque des outils d'IA participent au développement. Aucun nom d'étudiant, de marque ou de produit définitif n'est inventé dans ce document.

| Rôle | Possibilités et limites |
| --- | --- |
| Visiteur | Consulte l'accueil et choisit une langue, un thème ou un mode de connexion |
| Invité | Choisit un pseudonyme de 3 à 20 caractères, possède une session signée, rejoint une salle, participe ou observe ; avatar généré uniquement |
| Utilisateur connecté | Se connecte par GitHub ou Discord, peut créer une salle ; possède ensuite un profil, des statistiques et un historique |
| Hôte | Utilisateur connecté qui crée la salle ; choisit d'être participant ou spectateur ; contrôle configuration, démarrage, invitations, expulsions, relance et fermeture |
| Participant humain | Compte connecté ou invité qui prend part à une course |
| Bot | Participant simulé côté serveur, identifiable comme tel ; même capacité et mêmes règles de bonus que les humains |
| Spectateur | Observe sans taper ; ne compte ni dans la capacité ni dans le minimum de démarrage |
| Enseignant | Évalue les livrables et l'application publique, sans paiement requis |

L'identité d'une personne est établie par la session côté serveur, jamais par son pseudonyme ou un identifiant arbitraire fourni par le navigateur. Les actions de l'hôte sont autorisées côté serveur à chaque appel.

## 3 Périmètre et découpage

### 3.1 Ce qui doit être opérationnel au checkpoint

Le premier sprint livre les fondations prévues à la page 10 du PDF :

1. Cahier des charges et matrice initiale couvrant toutes les exigences, avec états honnêtes
2. Démarche créative complète : nom original choisi par l'étudiant, croquis et logo personnel, 3 à 5 références de moodboard, palette et typographies ; identité appliquée et favicon
3. Architecture initiale : modèle de données, machine à états de course, ADR temps réel, approche des bots
4. Application Next.js App Router, React, TypeScript strict, Tailwind et PostgreSQL avec migrations versionnées
5. Connexion GitHub et Discord réellement fonctionnelle ; session invitée conforme ; comptes seuls autorisés à créer
6. Création de salle et entrée par un code unique de 6 caractères, depuis l'accueil ; liste de présence mise à jour en temps réel
7. Contraintes serveur et DB applicables dès cette base : personne dans une seule salle, pas de doublon entre onglets, capacité bornée, validation des entrées et limitation des tentatives de code
8. Langue FR/EN et thème clair/sombre fonctionnels sur toutes les pages existantes, avec préférences conservées et valeurs initiales conformes
9. CI exécutée à chaque push : lint, vérification de types et quelques tests unitaires significatifs
10. Instance VPS publique HTTPS avec authentification, base de données et parcours salle démontrables

L'interface simple de Sprint 1 ne supprime aucune obligation de design ou d'accessibilité. Les tokens temporaires, le nom du dépôt et les boutons OAuth non configurés ne constituent pas l'identité finale ou une authentification validée.

### 3.2 Ce qui est conçu maintenant puis implémenté après Sprint 1

L'architecture définit dès maintenant la machine de course, l'autorité serveur, la reconnexion dans les 30 secondes, les principes de transfert d'hôte, la gestion déterministe des bots, la limitation de progression réseau et l'extension des données. Leur présence dans un diagramme n'implique pas leur fonctionnement dans le code.

### 3.3 Ce qui appartient aux sprints suivants

La remise finale ajoute l'explorateur public, la partie rapide, toutes les visibilités et invitations, la configuration détaillée, la course et sa piste, les bots, les bonus, les résultats et graphiques, le profil avec photo et statistiques, l'historique paginé, les tests Playwright complets, les mesures de performance et les livrables finaux. Chaque exigence reste obligatoire à la finale même si son implémentation est différée.

Aucune extension du pitch ne doit retarder ces obligations : capacité au-delà de 30, course uniquement entre bots, création automatique à la partie rapide, pénalités de points ou pondération avancée de caractères ne sont pas nécessaires à la conformité.

## 4 Parcours fonctionnels et règles de réception

### 4.1 Connexion et identité

Les deux fournisseurs OAuth, GitHub et Discord, sont proposés. Chaque parcours doit aboutir à une vraie session en production, avec gestion de l'annulation et des erreurs. Une connexion par nom d'utilisateur et mot de passe est permise et doit être disponible pour la suite E2E prévue par TEST-03. Si elle est activée, les mots de passe sont hachés avec Argon2, bcrypt ou scrypt ; aucun mot de passe en clair n'est conservé en DB ou dans les logs.

L'invité choisit son pseudonyme avant l'entrée, entre 3 et 20 caractères. Son cookie est signé. Il ne crée pas de salle, ne téléverse pas de photo et ne reçoit pas d'historique persistant. L'avatar généré ne constitue pas une photo de profil téléversée. Les comptes pourront modifier leur pseudonyme et envoyer une image JPEG, PNG ou WebP de 2 Mo maximum, validée selon son type réel et sa taille côté serveur puis redimensionnée.

Le profil final présente meilleur MPM, MPM moyen, précision moyenne, nombre de courses, nombre de victoires et évolution du MPM dans le temps. Les modalités détaillées d'agrégation doivent rester documentées, testées et distinctes des définitions normatives de l'annexe A.

**Recette attendue :** deux connexions OAuth réelles sur HTTPS, session absente/expirée refusée, création interdite à l'invité, bornes 2/3/20/21 du pseudo testées, absence de persistance d'historique invité, puis validation d'upload hostile et de statistiques lors de leur implémentation.

### 4.2 Création et appartenance à une salle

Un compte crée une salle et en devient hôte, en choisissant participant ou spectateur. Le code unique comporte exactement 6 caractères alphanumériques, sans `0`, `O`, `1`, `I` ou `L`. Une collision est gérée côté serveur sans créer deux salles ayant le même code.

La capacité est configurable entre 2 et 30 participants, bots compris, sans compter les spectateurs. Une personne ne peut appartenir qu'à une salle à la fois ; cette propriété est garantie par une contrainte en base. Rejoindre une autre salle propose de quitter la salle actuelle avant d'y entrer. Deux onglets sur la même salle ne créent pas deux personnes.

Les entrées ne sont autorisées qu'en attente ou sur l'écran des résultats. Une reconnexion à sa place pendant une course est un cas distinct, couvert par COURSE-08. La recherche par code est limitée par IP contre la force brute ; 10 tentatives par minute est une valeur d'implémentation raisonnable donnée en exemple par le PDF, pas une valeur normative unique.

Les présences entrantes et sortantes sont visibles sans rechargement manuel. Le protocole et le traitement précis des connexions multiples, pertes réseau et resynchronisations sont décrits dans [ARCHITECTURE.md](ARCHITECTURE.md).

**Recette attendue :** deux sessions distinctes créent/rejoignent ; les deux voient les présences ; un deuxième onglet ne double pas l'effectif ; une course/une salle pleine/un code invalide/un utilisateur déjà ailleurs donnent une erreur typée ; concurrence et unicité sont vérifiées sur PostgreSQL.

### 4.3 Visibilité et invitations

| Visibilité | Explorateur et partie rapide | Entrée autorisée |
| --- | --- | --- |
| Publique | Oui | Accès direct, code ou lien prévu par le produit |
| Sur code | Non | Code ou lien d'invitation |
| Privée | Non | Lien d'invitation uniquement ; le code seul est refusé |

La salle simple de Sprint 1 est explicitement « Sur code » si les autres parcours ne sont pas implémentés. Une salle accessible par code ne doit pas être annoncée « Privée ».

L'hôte pourra générer des liens distincts, les copier et voir leur statut non utilisé ou la personne associée. Chaque token possède au moins 128 bits d'entropie. À la première utilisation, le lien est lié à l'IP ; une autre IP est refusée, tandis que la personne associée peut le réutiliser pour se reconnecter. Une expulsion révoque le lien correspondant et empêche la personne de revenir dans cette salle. La fermeture invalide tous les liens. Les cas de réseau partagé et d'IP changeante sont des limites à documenter, pas des raisons de retirer la règle du PDF.

Quand l'hôte quitte réellement la salle, l'hôte suivant est l'humain connecté, participant ou spectateur, présent depuis le plus longtemps. S'il n'en reste aucun, la salle se ferme. La distinction entre départ volontaire et coupure temporaire doit être visible dans l'architecture et ses tests.

### 4.4 Rejoindre et trouver une course

L'accueil propose directement le champ de code. L'explorateur final liste seulement les salles publiques et affiche effectif/capacité, langue du texte, complexité, hôte et état. Au minimum, langue et complexité sont filtrables. La liste se met à jour sans rechargement.

La partie rapide sélectionne une salle publique joignable, non pleine, la plus proche de sa capacité maximale. En cas d'égalité, la plus ancienne est choisie. S'il n'y en a aucune, un compte voit une proposition de création de salle publique avec configuration par défaut ; l'invité voit un état vide. La définition mesurable de « proche de sa capacité » est fixée dans le registre de choix de [EXIGENCES.md](EXIGENCES.md).

### 4.5 Configuration de course

L'hôte règle en attente, puis entre deux courses :

- Temps maximal absent, ou durée entre 30 secondes et 10 minutes
- Langue du texte FR/EN, indépendamment de la langue de l'interface
- Texte cohérent extrait d'un corpus réel stocké en DB, ou mots aléatoires issus d'un dictionnaire ; sources et droits de réutilisation documentés
- Longueur exprimée en nombre de mots
- Complexité facile, moyenne ou difficile, selon des critères mesurables documentés
- Présence de ponctuation, nombres, majuscules et accents français
- Caractères à inclure/exclure en mode aléatoire ; en mode cohérent, option désactivée ou passages filtrés selon le choix documenté
- Correction obligatoire, bloquant l'avancée sur erreur, ou correction libre, autorisant la poursuite et comptant l'erreur
- Bonus activés ou non
- Ajout/retrait de bots et niveau individuel
- Visibilité et capacité de la salle

Toutes les personnes présentes voient chaque changement de configuration en temps réel. Les paramètres sont validés et autorisés côté serveur ; le client ne peut pas contourner les bornes.

### 4.6 Course et autorité serveur

Le cycle normatif est **EN_ATTENTE → DÉCOMPTE → EN_COURSE → RÉSULTATS → (EN_ATTENTE ou FERMÉE)**. Le diagramme et ses transitions autorisées sont dans [ARCHITECTURE.md](ARCHITECTURE.md).

Seul l'hôte démarre avec au moins deux participants dont un humain ; les bots comptent, les spectateurs non. Le décompte synchronisé affiche 3, 2, 1. Le texte est révélé au début de ce décompte, jamais avant.

La zone de frappe signale immédiatement caractères corrects/incorrects et curseur ; MPM et précision sont affichés en direct et le collage est désactivé. La piste montre avatar, nom, position et MPM de chaque humain ou bot, souligne le joueur local et fournit au moins environ quatre mises à jour perçues par seconde. Le spectateur voit la piste sans zone de frappe. À partir de 360 px, les pages restent utilisables ; sur mobile, un message remplace la course et recommande un clavier physique.

Le serveur décide des temps de départ/fin, progression, classement et bonus. Il rejette les sauts de progression et vitesses irréalistes ; le client ne soumet pas un score faisant autorité. Les messages de progression sont regroupés ou limités et aucune écriture DB n'a lieu à chaque frappe.

Un abandon volontaire demande confirmation. Après rechargement ou coupure réseau, le joueur reprend à sa place s'il revient dans les 30 secondes ; au-delà, il est abandonné. La course se termine quand tous ont terminé ou abandonné, ou à l'expiration du temps maximal.

Le classement place d'abord les terminés, par temps d'arrivée ; ensuite les personnes à court de temps, par progression ; enfin les abandons, par progression lors de l'abandon. Depuis les résultats, l'hôte relance avec les mêmes participants et peut changer la configuration, ou ferme la salle. Les autres restent ou quittent.

### 4.7 Bots

Le checkpoint fournit l'approche, sans annoncer le moteur comme implémenté. La cible comporte cinq niveaux :

| Niveau | MPM indicatif | Erreurs indicatives |
| --- | --- | --- |
| Noob | 10 à 20 | Environ 12 % |
| Débutant | 20 à 35 | Environ 8 % |
| Intermédiaire | 35 à 60 | Environ 5 % |
| Expert | 70 à 100 | Environ 2 % |
| Impossible | 140 et plus | Environ 0,5 % |

Ces chiffres sont ajustables à condition de documenter les valeurs retenues. Un bot varie sa vitesse, accélère, hésite et ralentit sur les mots difficiles. Ses erreurs ajoutent du temps de correction et respectent le mode d'erreur. Il est clairement identifié et subit les mêmes bonus/malus que les humains.

Un même état initial, une même configuration, une même seed et une même horloge simulée doivent produire les mêmes événements. La variété entre courses vient de seeds différentes, pas d'un moteur impossible à tester. Aucune vitesse constante ne satisfait BOT-02.

### 4.8 Bonus et calculs

Quand les bonus sont actifs, une personne est en retard si elle est dernière ou à plus de 25 points de progression derrière le meneur. Les contrôles se produisent lorsque le meneur franchit 25 %, 50 % et 75 %. Une personne reçoit au maximum trois bonus par course. La règle exacte, la gestion des égalités et les modifications du texte doivent être documentées et testées avant mise en service.

Il faut au moins trois types, avec au moins une aide au retardataire et un effet ralentissant le meneur. Les exemples du PDF sont ajout de trois mots au meneur, retrait de trois mots au retardataire et brouillard temporaire. Ils restent des exemples, pas trois choix imposés. L'activation est annoncée sur la piste et à la cible.

Les définitions de l'annexe A, page 12, sont normatives :

| Mesure | Définition |
| --- | --- |
| MPM net | `(caractères correctement tapés / 5) / minutes écoulées` |
| MPM brut | `(nombre total de caractères tapés / 5) / minutes écoulées` |
| Précision | `frappes correctes / frappes totales × 100` |
| Progression | `caractères validés / longueur totale du texte`, tenant compte des mots ajoutés/retirés |

Les espaces comptent comme caractères. Les conventions à temps nul, sans frappe et les bornes après modification du texte sont des choix complémentaires à tester ; elles ne changent pas ces formules. Les bonus ne doivent pas gonfler artificiellement le nombre de caractères correctement tapés.

### 4.9 Résultats et historique

Les résultats finaux comprennent le podium des trois premiers et un tableau avec rang, participant, MPM, MPM brut, précision, erreurs, temps, statut terminé/temps écoulé/abandon et bonus reçus. Il faut au moins deux graphiques : évolution du MPM pour tous les participants sur le même graphique et touches personnelles les plus manquées, par exemple une carte de chaleur du clavier. Un record personnel battu est signalé.

Les résultats et séries temporelles MPM de chaque humain connecté sont persistés. Chaque course terminée apparaît dans son historique paginé et ouvre de nouveau la page de résultats complète. Les invités n'ont pas d'historique persistant ; les bots ne deviennent pas des comptes utilisateurs.

## 5 Architecture et données

La source détaillée est [ARCHITECTURE.md](ARCHITECTURE.md). L'application suit un **monolithe modulaire**, pas un découpage en microservices. Les modules exposent des contrats publics et des points d'entrée serveur. Les routes restent fines, la composition orchestre les cas intermodules, les superviseurs portent le métier et les repositories isolent la persistance. Les modules ne s'importent pas directement entre eux et le code partagé ne dépend pas des modules. Le navigateur ne reçoit ni repository, ni conteneur, ni secret.

La base PostgreSQL doit couvrir progressivement identités, comptes/sessions, salles, appartenances, configurations, corpus, courses, progressions/résultats, séries temporelles, invitations et exclusions. Le modèle distingue le nécessaire au checkpoint des entités futures. Les migrations sont versionnées ; les contraintes de code unique et d'appartenance unique sont vérifiées dans la base réelle. Le seed final fournit corpus, utilisateurs et historique ; un seed initial limité ne doit pas être déclaré conforme au seed complet.

L'ADR temps réel compare les options, explique la solution retenue, son exécution sur le VPS, l'authentification des connexions, la validation des messages, les versions d'état, les reconnexions et les coûts. Les détails du protocole et les schémas de données appartiennent aux documents d'architecture, pas à une copie divergente ici.

## 6 Qualité transversale

### 6.1 Code et intégration continue

Le dépôt contient du TypeScript, sans fichier `.js` ou `.jsx`. `strict: true` est activé ; `@typescript-eslint/no-explicit-any` est une erreur. Toute directive `@ts-ignore` ou `@ts-expect-error` possède un commentaire justificatif. Next.js utilise l'App Router avec une version stable actuelle vérifiée lors du verrouillage, React et Tailwind.

Chaque push déclenche lint, `tsc --noEmit` et tests unitaires dans GitHub Actions. Les tests ciblent les règles métier et refus d'accès, pas seulement le rendu heureux. Les tests E2E finaux sont Playwright, avec connexion locale username/password plutôt qu'OAuth. Les callbacks OAuth réels nécessitent une preuve manuelle séparée.

### 6.2 Internationalisation et accessibilité

Tous les libellés, erreurs, états vides et métadonnées sont disponibles en français et anglais, sans chaîne UI codée en dur. Un sélecteur est présent sur chaque page ; le choix est conservé par cookie/profil et le navigateur fournit la langue initiale. Dates et nombres suivent la locale choisie.

Les deux thèmes respectent WCAG AA pour le contraste du texte. Les pages utilisent boutons pour les actions, liens pour les navigations, titres ordonnés, landmarks `header`, `nav`, `main`, `footer` et vrais tableaux pour les données tabulaires. Les champs sont libellés, les images possèdent un texte alternatif pertinent et les contrôles sont utilisables au clavier avec focus visible. Les changements temps réel ne doivent pas rendre l'interface inutilisable au clavier.

### 6.3 Sécurité et confidentialité

Toutes les entrées serveur sont validées par schéma : actions serveur, API et messages temps réel. Toutes les opérations réservées à l'hôte vérifient sa qualité côté serveur. Les secrets restent hors Git ; `.env.example` décrit toutes les variables, sans valeurs secrètes. Les tokens d'invitation, cookies et mots de passe ne sont pas consignés dans les logs.

Les données invitées restent limitées à la session et à la présence nécessaires au jeu, sans historique persistant ni photo. Les règles de révocation, d'expulsion, d'upload et de reconnexion font l'objet de tests de refus. Les secrets OAuth et accès au VPS doivent être fournis par le canal sécurisé approprié ; la documentation ne prétend pas les avoir créés ou validés.

### 6.4 Performance et exploitation

L'accueil doit atteindre au moins 90 dans chaque catégorie Lighthouse à la finale. La piste est testée à 30 participants, avec un mouvement fluide. Le regroupement/limitation réseau est mesurable ; une cadence indicative de 10 messages par seconde et par joueur doit être justifiée si retenue. Les frappes ne déclenchent pas une écriture DB individuelle.

L'application est déployée sur VPS, accessible publiquement en HTTPS et fonctionnelle au checkpoint puis à la finale. Le coût du VPS revient à l'étudiant, sauf serveur fourni par le cégep. Tous les autres services externes utilisent un forfait gratuit et l'enseignant ne paie rien. Aucun achat ni engagement financier n'est supposé autorisé par ce cahier des charges.

## 7 Direction artistique et contribution personnelle

La direction artistique est documentée **avant le développement** dans le fichier imposé `docs/DEMARCHE-CREATIVE.md`. Si cette chronologie n'a pas été respectée, elle doit être signalée honnêtement ; ce document ne doit pas être antidaté.

Les éléments suivants sont à fournir/valider, et ne sont pas déclarés terminés :

- [ ] Étudiant : liste de noms envisagés, recherche de produits connus, choix original et justification, **sans génération IA du nom**
- [ ] Étudiant : croquis originaux papier/tablette et logo conçu **sans IA** ; conserver les sources
- [ ] Mise au propre/vectorisation éventuelle du croquis personnel, sans remplacement du concept par une création IA
- [ ] Nom et logo définitifs pour le checkpoint ; application dans l'interface et favicon
- [ ] Moodboard de **3 à 5 références** avec leurs sources et l'utilité de chaque référence
- [ ] Palette explicite pour clair/sombre, états interactifs, erreurs, focus et contrastes
- [ ] Typographies, rôles, graisses et sources/licences
- [ ] Proposition de piste servant de signature visuelle du produit
- [ ] Personnalisation réelle des composants ; pas de shadcn par défaut, hero violet générique, emoji-icônes ou landing SaaS sans lien avec le thème
- [ ] Préférence système par défaut, sélecteur de thème et absence de flash du mauvais thème
- [ ] Vérification à 360 px, au clavier et dans les deux thèmes

Le nom technique du dépôt sert uniquement à identifier le travail. Il n'est pas présenté comme le nom original exigé. **Le nom, le logo et leurs croquis constituent un apport humain bloquant que l'automatisation ne peut pas remplacer.**

## 8 Planning et priorités de réception

| Étape | Résultat attendu | Dépendances |
| --- | --- | --- |
| Fondations du Sprint 1 | Périmètre corrigé, architecture, TypeScript strict, PostgreSQL, contrats et tests | Source PDF, choix de conception |
| Tranche fonctionnelle | Identité, compte/invité, création/rejoindre, présence temps réel, FR/EN et thèmes | Migration, sessions et transport |
| Préparation du lundi 5 octobre | Démonstration sur VPS HTTPS, GitHub et Discord, preuves CI, docs et identité finale | Accès au VPS, configuration OAuth sécurisée, nom/logo de l'étudiant |
| Après checkpoint | Intégration de la rétroaction, course/configuration, bots/bonus, résultats/historique | Architecture et socle vérifiés |
| Avant finale semaine 11 | Recette complète, performance/accessibilité, documentation finale, comptes démo et partage enseignant | Date civile et heure à confirmer |

Le chemin critique du checkpoint est l'obtention des apports humains et des accès nécessaires, puis les vérifications réelles en production. Une compilation locale ou une configuration exemple ne ferme pas ces dépendances.

## 9 Définition de terminé et preuves

Une exigence est **complète** seulement si tous ses sous-critères sont implémentés, vérifiés dans le contexte applicable et reliés à des preuves consultables. Elle est **partielle** si une partie démontrable existe avec une limite explicite. Elle est **non faite** quand il n'existe pas encore de réalisation vérifiée. « Prévu », « décrit » et « code présent » ne valent pas « complet ».

Chaque preuve associe le commit exact, le scénario ou la commande, le résultat, la date et un fichier/rapport/lien. Les preuves OAuth sont distinctes pour GitHub et Discord ; les preuves VPS indiquent l'URL HTTPS ; la preuve CI pointe vers le run du commit remis. Les captures ne remplacent pas les tests de contraintes et les tests locaux ne remplacent pas la production.

La recette détaillée et la grille du checkpoint sur 100 points se trouvent dans [CHECKPOINT_1.md](CHECKPOINT_1.md). La [matrice](EXIGENCES.md) relie les 90 IDs, pages sources, issues, échéances, preuves existantes et preuves manquantes. Les scores restent ceux de l'enseignant, sans auto-attribution de points.

## 10 Risques et livrables finaux

| Risque | Conséquence | Réponse attendue |
| --- | --- | --- |
| Nom/logo personnels absents | Démarche créative et identité du checkpoint incomplètes | Obtenir les créations de l'étudiant et les intégrer sans les inventer |
| Accès VPS ou OAuth absents | Production/authentification non démontrées | Faire configurer les accès nécessaires ; conserver un statut bloqué honnête |
| Trop de fonctionnalités avant lundi | Fondations livrées sans preuve | Prioriser la tranche S1, garder le reste dans le backlog |
| Divergence pitch/PDF | Réalisation fonctionnelle mais non conforme | Appliquer le tableau de priorité et les 90 IDs |
| Statut « complet » prématuré | Pénalité spécifique du PDF | Exiger la preuve de chaque sous-critère, signaler les limites |
| Race conditions multi-onglets | Doubles présences ou plusieurs salles | Contraintes PostgreSQL et tests concurrents |
| Frontières modulaires contournées | Couplage et reprise coûteuse du moteur de course | Tests de frontières et revue des points d'entrée |
| Provenance corpus/assets inconnue | Réutilisation non justifiée | Conserver sources et licences avant intégration |

La finale comprend aussi les livrables de la page 11 : dépôt GitHub partagé avec l'enseignant, historique de commits régulier et significatif, URL publique, README avec présentation/captures/technologies/installation/variables/tests et compte de démonstration local ; architecture finale incluant flux temps réel et ADR bots ; matrice complète ; démarche créative avec images ; `docs/IA.md` de 1 à 2 pages décrivant outils, instructions d'agents versionnées, **trois situations réelles** d'erreur de l'IA avec détection/correction, et réflexion personnelle. Aucun incident ni témoignage personnel ne doit être inventé pour remplir ce dernier document.
