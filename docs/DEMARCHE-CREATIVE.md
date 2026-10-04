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
- [x] PNG fourni le 4 octobre 2026 intégré sans modification dans la navigation et le footer ; vérifié dans le navigateur. La provenance personnelle sans IA reste non vérifiée.
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

**État au 4 octobre 2026 :** la seconde maquette rétro arcade de la conversation a été explicitement approuvée puis demandée en frontend. Palette implémentée : crème `#fff9ee`, encre `#171916`, surface `#fffdf8`, jaune `#ffe264`, rose `#ff7a9e`, bleu `#2457da`, menthe `#8ee3bf`. Le thème sombre emploie fond `#171b22`, surface `#242c38`, texte `#fff9ee` et contours `#fff1d9`, avec les accents conservés. La nouvelle direction ne prétend pas compléter le moodboard sourcé de 3–5 références ni antidater le socle initial.

### Typographies

- [ ] Familles, sources/licences et raisons de choix
- [ ] Rôles, tailles, graisses et interlignes pour titres, corps, contrôles, chiffres et texte à saisir
- [ ] Lisibilité des caractères proches et rendu des accents français
- [ ] Vérification mobile et deux thèmes
- [ ] Capture des typographies effectivement appliquées

**État au 4 octobre 2026 :** pile système Trebuchet MS / Arial / Helvetica / sans-serif ; titres avec Arial Rounded MT Bold si installé, puis Trebuchet MS ; labels, badges et codes en monospace système. Aucun téléchargement de police ou nouvelle dépendance. Titres larges et serrés, labels compacts et champs d’au moins 50 px ; les polices réellement disponibles déterminent le rendu. Il s’agit du choix d’implémentation de la maquette approuvée, pas d’une justification personnelle inventée.

## 3 Contraintes d'interface déjà retenues

La première direction de travail était backend d’abord avec une interface initiale simple. Le 4 octobre 2026, l’utilisateur a approuvé une seconde maquette rétro arcade et demandé son implémentation : fond crème, contours épais, ombres décalées, cartes jaune/papier, accent rose/bleu, illustration clavier, navigation et footer partagés. Cette décision récente remplace les styles neutres ; les opérations réelles, les contraintes de langues/thèmes et le périmètre de salon restent inchangés.

Le même jour, l’utilisateur a fourni le PNG CLAK!, intégré sans transformation dans la navigation et le footer (`public/brand/clak-logo.png`). Le nom visible est repris de ce fichier. La fourniture du PNG ne constitue pas une vérification de sa création personnelle sans IA ; les croquis, raisons du nom, contrôle d’originalité et favicon restent à documenter. Aucun concept de logo ou nom supplémentaire n’a été produit par l’agent.

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
