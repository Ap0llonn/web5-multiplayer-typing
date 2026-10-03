# Démarche créative de la course de frappe

Document de préparation du 3 octobre 2026 · **Incomplet et bloqué sur les contributions personnelles de l'étudiant**

Ce fichier ouvre le livrable demandé aux pages 2, 3 et 10 du PDF `1789876438454.pdf`. Il ne présente ni un nom définitif, ni un logo original, ni une direction artistique achevée. Les cases ci-dessous n'attestent aucun travail déjà accompli. Le nom technique `web5-multiplayer-typing` identifie le dépôt ; il n'est pas présenté comme le nom de produit exigé.

## 1 Contribution personnelle obligatoire

DES-01 et DES-02 imposent que **le nom et le logo viennent de l'étudiant, sans IA**. Le checkpoint exige leur version définitive. L'utilisation d'un outil pour nettoyer/vectoriser un croquis personnel est permise ; générer le concept, le nom ou des croquis prétendument personnels avec une IA ne l'est pas.

### Nom du site

- [ ] Noms réellement envisagés par l'étudiant : **à fournir par l'étudiant**
- [ ] Vérification qu'ils ne désignent pas déjà un produit connu, avec sources/date : **à fournir**
- [ ] Nom final choisi personnellement : **à fournir**
- [ ] Raisons du choix, rédigées à partir du raisonnement réel de l'étudiant : **à fournir**
- [ ] Confirmation du caractère définitif pour le checkpoint : **à fournir**

Aucun nom candidat ni justification personnelle n'a été inventé dans ce dossier.

### Logo et croquis

- [ ] Photos/scans des croquis papier ou exports tablette originaux : **à fournir par l'étudiant**
- [ ] Explication personnelle du concept retenu : **à fournir**
- [ ] Source du logo final et export vectoriel ou image : **à fournir**
- [ ] Si nettoyage/vectorisation : décrire l'outil, la transformation et conserver le croquis d'origine : **à fournir si applicable**
- [ ] Logo intégré dans l'application : **à vérifier après réception**
- [ ] Favicon dérivé du logo : **à vérifier après réception**
- [ ] Confirmation du caractère définitif pour le checkpoint : **à fournir**

Aucun asset de substitution n'est considéré comme le logo final. Les captures de l'interface devront montrer le vrai logo après intégration.

## 2 Direction artistique à compléter

DES-03 demande une direction documentée **avant le développement**. Ce dossier est préparé alors que le socle technique est en cours ; il ne certifie pas qu'une direction artistique complète lui a précédé. La chronologie réelle et toute limite doivent rester explicites, sans antidater le document.

### Moodboard de trois à cinq références

Chaque référence doit servir un choix concret de composition, typographie, couleur, interaction ou représentation de la course. Les liens et observations ci-dessous sont à renseigner après sélection réelle, sans inventer des sources consultées.

| Référence | Source exacte | Élément observé | Utilisation prévue sans copie |
| --- | --- | --- | --- |
| 1 | À fournir | À fournir | À fournir |
| 2 | À fournir | À fournir | À fournir |
| 3 | À fournir | À fournir | À fournir |
| 4, facultative | À fournir si retenue | À fournir | À fournir |
| 5, facultative | À fournir si retenue | À fournir | À fournir |

### Palette

- [ ] Couleurs finales et valeurs : fonds, surfaces, texte, secondaire, accent, erreur/succès, focus
- [ ] Correspondances clair et sombre
- [ ] Mesures de contraste WCAG AA pour les textes dans chaque thème
- [ ] Identification du joueur local, des autres humains et des bots sans dépendre seulement de la couleur
- [ ] Capture de la palette effectivement appliquée

**État :** aucune palette finale validée dans ce dossier. Des styles neutres de développement ne constituent pas la direction artistique définitive.

### Typographies

- [ ] Familles, sources/licences et raisons de choix
- [ ] Rôles, tailles, graisses et interlignes pour titres, corps, contrôles, chiffres et texte à saisir
- [ ] Lisibilité des caractères proches et rendu des accents français
- [ ] Vérification mobile et deux thèmes
- [ ] Capture des typographies effectivement appliquées

**État :** choix finaux à fournir/valider. Aucune police n'est attribuée à tort à un choix personnel déjà fait.

## 3 Contraintes d'interface déjà retenues

La direction de travail approuvée est backend d'abord avec une interface initiale simple. Cela concerne l'ordre de réalisation, sans retirer les exigences graphiques du checkpoint.

- Conserver clair et sombre, préférence système par défaut, sélection persistante et aucun flash du mauvais thème
- Concevoir l'accueil autour de l'accès à une course et du code de salle, avec des états d'erreur et d'attente explicites
- Rendre les pages existantes utilisables dès 360 px et au clavier, avec focus visible, labels et HTML sémantique
- Préparer une piste de progression qui soit la signature visuelle du produit ; sa réalisation complète appartient au moteur de course après S1
- Éviter les composants shadcn/ui non personnalisés, le hero violet générique, les emojis servant d'icônes et une landing SaaS sans lien avec la frappe
- Prévoir, quand la course sera implémentée, le message mobile recommandant un clavier physique

Ces contraintes sont documentées ; elles ne sont pas toutes démontrées par l'interface actuelle. Les preuves figurent dans [CHECKPOINT_1.md](CHECKPOINT_1.md) lorsqu'elles sont réellement obtenues.

## 4 Validation avant remise

- [ ] Étudiant identifié uniquement par des informations qu'il a lui-même fournies
- [ ] Nom et logo sans IA, provenance et croquis originaux présents
- [ ] 3 à 5 références, palette et typographies complètes
- [ ] Chronologie de conception explicitée honnêtement
- [ ] Identité définitive appliquée au site et favicon
- [ ] Deux thèmes, contraste, mobile et clavier vérifiés
- [ ] DES-01 à DES-06 mis à jour dans [EXIGENCES.md](EXIGENCES.md) selon les preuves réelles

**Statut actuel : dossier de collecte, pas livrable créatif complet.** Les contributions personnelles restent nécessaires avant de clôturer les critères correspondants.
