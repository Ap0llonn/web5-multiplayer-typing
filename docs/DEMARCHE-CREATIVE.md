# Démarche créative de la course de frappe

Document de préparation du 3 octobre 2026, complété pour la refonte du 4 octobre et le prototype du 5 octobre 2026 · **Contributions personnelles de l'étudiant encore requises**

Ce fichier ouvre le livrable demandé aux pages 2, 3 et 10 du PDF `1789876438454.pdf`. Il décrit les références et les choix de présentation effectivement retenus, sans certifier un nom définitif, la création personnelle du logo ou une direction artistique entièrement validée. Les cases distinguent la documentation présente des preuves restant à produire. Le nom technique `web5-multiplayer-typing` identifie le dépôt ; le nom visible CLAK! est repris du PNG fourni par l'utilisateur.

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

## 2 Direction artistique documentée, validation à compléter

DES-03 demande une direction documentée **avant le développement**. Ce dossier a été ouvert alors que le socle technique était en cours ; il ne certifie pas qu'une direction artistique complète lui a précédé. Pour la demande ludique suivante du 4 octobre 2026, la recherche et le [contrat de refonte](ui-playful.md) précèdent la réalisation correspondante. La palette et les rôles ci-dessous décrivent ensuite les fichiers réellement intégrés. Cette chronologie ne doit pas être antidatée ni présentée comme le raisonnement personnel de l'étudiant.

### Moodboard de trois à cinq références

Quatre références officielles ont été consultées le 4 octobre 2026 pour répondre à la demande d'une interface ludique inspirée de Kahoot. Elles guident les parcours, les formes et les illustrations, sans reprise de logo, personnage ou asset.

| Référence | Source exacte | Élément observé | Utilisation prévue sans copie |
| --- | --- | --- | --- |
| Kahoot! | [Page de participation](https://kahoot.it/) | Entrée par code PIN et action « Rejoindre » immédiatement identifiables, langue accessible | Priorité au parcours rejoindre ; deux actions réelles et distinctes pour rejoindre/créer |
| Duolingo | [Shape language: how we create Duolingo's art style](https://blog.duolingo.com/shape-language-duolingos-art-style/) | L'équipe décrit formes arrondies, couleurs franches, silhouettes simples, espace négatif et exagération ludique | Boutons tactiles, touches de clavier en volume et décors lisibles ; aucun personnage repris |
| Blooket | [Accueil](https://www.blooket.com/) et [entrée de jeu](https://play.blooket.com/play) | Famille d'illustrations récurrente et entrée rapide avec Game ID | Une même famille de touches décoratives sur accueil/authentification ; formulaires courts |
| Poki | [Accueil](https://poki.com/) | Accès direct aux jeux et aux catégories, invitation immédiate à jouer | Mettre les parcours S1 utilisables à portée, sans faux catalogue ni statistiques inventées |

L'adaptation retenue est un **terrain de jeu des claviers** : surfaces arrondies, boutons qui s'enfoncent, grandes touches illustrées et couleurs franches. Ce descriptif désigne un thème d'interface, pas un nom de produit. Les mouvements décoratifs ont une alternative sans animation avec `prefers-reduced-motion` ; leur comportement reste à vérifier dans la recette.

### Palette

- [x] Valeurs des fonds, surfaces, textes, accents, erreurs et focus relevées dans les tokens actuels
- [x] Correspondances clair et sombre documentées
- [ ] Mesures de contraste WCAG AA pour les textes dans chaque thème
- [ ] Identification du joueur local, des autres humains et des bots sans dépendre seulement de la couleur
- [ ] Capture de la palette effectivement appliquée

**État après la demande ludique du 4 octobre 2026 :** les valeurs suivantes sont celles de `src/shared/presentation/styles/tokens.css`. Elles remplacent les valeurs de la précédente maquette rétro arcade.

| Rôle / token | Clair | Sombre |
| --- | --- | --- |
| Fond `--bg` | `#fbf9f3` | `#141d31` |
| Texte `--fg` | `#202944` | `#f5f6ff` |
| Surface `--panel` | `#ffffff` | `#202d48` |
| Texte secondaire `--muted` | `#59637a` | `#bec8df` |
| Contours `--border` | `#dce0e9` | `#435371` |
| Contours des contrôles `--control-border` | `#7e8aa0` | `#8799bc` |
| Ombre `--shadow` | `#dce1ee` | `#0b1324` |
| Accent et focus `--accent` | `#2455d8` | `#a7c2ff` |
| Surface douce `--soft` | `#f0f2f7` | `#2b3a58` |
| Hero / contour | `#eaf0ff` / `#d9e3ff` | `#223657` / `#354b70` |
| Erreur `--error` | `#b4223e` | `#ff9daf` |
| Accents conservés dans les deux thèmes | Bleu `#2455d8`, jaune `#ffdf78`, corail `#ffa594`, menthe `#b2e9d3` | Identiques ; texte sur couleurs `#202944` |

La carte jaune possède ses propres valeurs locales : fond `#fff2c6`, texte `#202944`, secondaire `#635938`, surface de champ `#fffdf5`, contour décoratif `#ddc984`, contour des contrôles `#978552` et ombre `#e8d699`. La menthe sert de décor, sans statut de réussite implicite. Les contours de champs ont été séparés des contours décoratifs après revue : contrastes calculés de 3,48:1 en clair, 4,78:1 en sombre et 3,56:1 sur surface jaune. Les preuves de recette figurent séparément dans [verification.md](verification.md).

### Typographies

- [x] Famille, source/licence et raisons du choix d'implémentation documentées
- [x] Rôles, tailles, graisses et interlignes des pages actuellement implémentées documentés
- [ ] Lisibilité des caractères proches et rendu des accents français
- [ ] Vérification mobile et deux thèmes
- [ ] Capture des typographies effectivement appliquées

**État après la demande ludique du 4 octobre 2026 :** Nunito variable est auto-hébergée dans `public/fonts/nunito-variable.ttf`. La source est le [dépôt officiel Google Fonts](https://github.com/google/fonts/tree/main/ofl/nunito) ; la licence SIL Open Font License 1.1 et l'attribution aux auteurs du projet Nunito sont conservées dans `public/fonts/OFL.txt`. Le layout de locale charge la police locale avec `display: swap` et fournit `--font-nunito`, suivie de `Trebuchet MS`, Arial et sans-serif en repli. Ses formes arrondies accompagnent les touches illustrées ; l'auto-hébergement rend le fichier de police identique entre les machines et évite un appel au service Google Fonts pendant l'affichage.

| Usage actuel | Règle appliquée |
| --- | --- |
| Titres | Nunito, graisses 950–1000 ; titre principal `clamp(3.3rem, 5.2vw, 4.8rem)`, interligne 1.04 et règles dédiées au mobile |
| Corps | Nunito, interligne de base 1.55 ; descriptions 600–650 selon leur contexte |
| Contrôles | Nunito ; boutons en 900, labels en 900, saisie 1rem en 700 ; champs d'au moins 50 px |
| Code de salle | Monospace système, 900, taille `clamp(2rem, 5vw, 3.25rem)` et espacement 0.15em |

Le texte de course n'est pas encore implémenté. Les accents français, caractères proches, deux thèmes et tailles mobiles doivent être vérifiés sur la version finale. Ces choix d'implémentation ne sont pas une justification personnelle attribuée à l'étudiant.

### Illustrations et composants

Les décors `public/illustrations/keyboard-playground.png` et `public/illustrations/keycap-friends.png` ont été générés avec `image_gen` pour cette demande. Ils représentent une famille cohérente de touches en volume ; ils ne servent ni de logo, ni de favicon, ni de faux croquis de marque. `DecorativeImage` les rend avec texte alternatif vide et `aria-hidden`, car les informations et commandes utiles restent dans le HTML traduit. Les icônes simples restent des SVG.

`ActionHeading` et `AuthLayout` appartiennent à l'UI générique partagée ; `HowItWorks` appartient à la composition de l'accueil et présente les étapes réelles d'accès à une salle. Les cartes, champs, boutons et textes FR/EN déclinent le thème sur accueil, authentification et salon, sans modifier les contrats métier.

## 3 Contraintes d'interface déjà retenues

La première direction de travail était backend d'abord avec une interface initiale simple. Le 4 octobre 2026, l'utilisateur a approuvé une seconde maquette rétro arcade et demandé son implémentation. Une demande ultérieure du même jour réclame une interface plus ludique, inspirée de Kahoot, avec recherche et images originales : le **terrain de jeu des claviers** remplace donc cette direction rétro. La recherche et le contrat précèdent cette nouvelle réalisation, mais pas le socle ni la précédente maquette. Les opérations réelles, les contraintes de langues/thèmes et le périmètre de salon restent inchangés.

Le même jour, l’utilisateur a fourni le PNG CLAK!, intégré sans transformation dans la navigation et le footer (`public/brand/clak-logo.png`). Le nom visible est repris de ce fichier. La fourniture du PNG ne constitue pas une vérification de sa création personnelle sans IA ; les croquis, raisons du nom, contrôle d’originalité et favicon restent à documenter. Aucun concept de logo ou nom supplémentaire n’a été produit par l’agent.

- Conserver clair et sombre, préférence système par défaut, sélection persistante et aucun flash du mauvais thème
- Concevoir l'accueil autour de la création et de l'accès aux salles existantes, avec des états d'erreur et d'attente explicites ; la course reste future
- Rendre les pages existantes utilisables dès 360 px et au clavier, avec focus visible, labels et HTML sémantique
- Préparer une piste de progression qui soit la signature visuelle du produit ; sa réalisation complète appartient au moteur de course après S1
- Éviter les composants shadcn/ui non personnalisés, le hero violet générique, les emojis servant d'icônes et une landing SaaS sans lien avec la frappe
- Prévoir, quand la course sera implémentée, le message mobile recommandant un clavier physique

Ces contraintes sont documentées ; elles ne sont pas toutes démontrées par l'interface actuelle. Les contrôles de cette refonte sont en cours et leurs résultats doivent figurer dans [verification.md](verification.md), puis dans [CHECKPOINT_1.md](CHECKPOINT_1.md) lorsque leur portée le justifie. Les résultats de la version rétro arcade restent historiques et ne prouvent pas la nouvelle version.

### Salon de démonstration — 5 octobre 2026

La première demande du 5 octobre autorisait une nouvelle page avec mocks, entrée par nom de salle puis choix du pseudo. Le **clubhouse des claviers** prolonge la palette et les touches illustrées avec une terrasse miniature, une grille de joueurs et un billet personnel séparé. Cette première version associait grille et billet dans le salon, avec résumé des réglages sous les deux panneaux et billet en premier sur mobile. Ses captures et ses 31 E2E validés restent une preuve historique de ce parcours.

La correction utilisateur du même jour remplace cette organisation par **code → pseudo/personnage → salon**, avec une URL par étape dans les deux langues : `/[locale]/play`, `/[locale]/play/player`, `/[locale]/play/room`. Le code comporte six caractères dans l’alphabet du vrai parcours. La page du personnage réunit le pseudo et les quatre touches `cobalt`, `coral`, `mint`, `butter` ; le salon libère cet espace pour la scène et les joueurs, et propose un bouton Modifier au lieu d’un formulaire intégré. Modifier ouvre le choix prérempli, annuler conserve le personnage confirmé et enregistrer actualise sa ligne unique. Cette séparation répond à la demande récente et conserve le thème original de terrasse, sans reprendre une salle de classe, QR code ou lancement factice.

Le décor opaque `typing-clubhouse.png` est généré avec l’outil intégré `image_gen` ; il ne contient ni texte, joueur ni marque. Les quatre avatars de touches sont des SVG simples. Le [contrat de présentation](play-preview.md), les [prompts finaux](../public/illustrations/README.md) et l’[inspection du parcours à trois pages](play-preview.md#inspection-du-parcours-à-trois-pages) documentent cette évolution. Le nom et le logo fournis restent inchangés, sans certification de leur provenance personnelle. Le 5 octobre 2026, la correction passe **33 E2E** (huit scénarios de démonstration et 25 régressions), dont **36 combinaisons axe** sur les trois pages en FR/EN, clair/sombre et 360/820/1440 px ; le clavier et le focus sont couverts. Les 20 intégrations et le build de production passent également. L’inspection CUA et les captures `play-code-entry.png`, `play-player-setup.png`, `play-room-simple.png` et `play-room-simple-mobile.png`, dans `docs/images`, montrent les trois étapes, le joueur sauvegardé prérempli en édition et le salon à 1440/360 px avec thème sombre conservé. Le contrôle de types autonome passe également après régénération du cache de types Next de développement ; résultats et limites figurent dans le [rapport courant](verification.md#parcours-code-et-joueur-sur-pages-dédiées--5-octobre-2026). Cette maquette conserve uniquement un état en mémoire, effacé à la sortie ou au rechargement ; elle ne réalise ni adhésion réelle ni course et ne complète pas la piste de course ou la démarche personnelle de marque.

## 4 Validation avant remise

- [ ] Étudiant identifié uniquement par des informations qu'il a lui-même fournies
- [ ] Nom et logo sans IA, provenance et croquis originaux présents
- [x] Quatre références consultées, palette réelle et typographies des pages actuelles documentées
- [x] Chronologie de conception explicitée sans antidater le socle
- [ ] Identité définitive appliquée au site et favicon
- [ ] Deux thèmes, contraste, mobile et clavier vérifiés
- [ ] DES-01 à DES-06 mis à jour dans [EXIGENCES.md](EXIGENCES.md) selon les preuves réelles

**Statut actuel : dossier de collecte, pas livrable créatif complet.** Les contributions personnelles restent nécessaires avant de clôturer les critères correspondants.
