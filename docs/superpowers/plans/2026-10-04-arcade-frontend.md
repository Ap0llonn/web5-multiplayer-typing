# Frontend rétro arcade — plan d’implémentation

**Objectif :** appliquer la maquette rétro arcade approuvée le 4 octobre 2026 aux parcours existants, avec navigation, footer, layouts et composants réutilisables.

**Architecture :** composants génériques dans `shared/presentation/ui`, assemblage et identité de navigation dans `composition/site`, formulaires métier dans leur module. `app/[locale]/layout.tsx` conserve les providers et délègue le shell à la composition. Aucun changement de contrat HTTP, d’authentification ou de DB.

**Référence :** seconde maquette générée dans cette conversation, explicitement approuvée puis demandée en frontend. Elle est adaptée aux opérations existantes : session invitée avant entrée, création par compte, vrais champs capacité/rôle. Exigences TECH-03, DES-04/05/06, I18N-01/02 et accessibilité. L’autorisation directe d’implémenter porte sur cette direction ; exécution dans le checkout courant en préservant les changements déjà présents.

## Contraintes

- Fond crème, jaune, rose, bleu, contours encre et ombres décalées ; variante sombre équivalente.
- Tailwind, TypeScript strict, labels FR/EN et focus visible ; viewport dès 360 px.
- Aucun nom/logo inventé, faux lien de profil, course, bots ou succès simulé. Mise à jour utilisateur en cours d’exécution : intégrer le PNG CLAK! fourni sans transformation dans nav/footer ; origine personnelle et favicon non certifiés.
- Boutons génériques `type="button"` par défaut ; soumissions explicites.
- Clavier décoratif SVG original, caché aux technologies d’assistance ; aucun texte dans l’illustration.
- Contrats métier et garde d’indisponibilité identité préservés ; PostgreSQL uniquement jetable pour les tests.

## Étapes

- [x] Ajouter et exécuter les régressions de présentation : shell accessible, choix compte/invité, formulaires et invités sans création.
- [x] Extraire Button/buttonStyles, Card, Badge, Field/Input/Select, icônes génériques, SiteNavigation, SiteFooter et Shell.
- [x] Assembler SiteLayout (contrôle d’identité serveur injecté au shell), HomeHero, accueil, AuthLayout et formulaires existants avec ces composants.
- [x] Ajouter tokens clair/sombre, styles responsive et traductions ; conserver les noms fonctionnels existants pour les contrats E2E.
- [x] Vérifier lint/types/frontières/unitaires, intégration PostgreSQL jetable, build et E2E pertinents ; inspecter le rendu navigateur. 58 unitaires et 15 E2E passent ; 17 intégrations passent, trois tests de seed restent en échec sur le launcher Windows préexistant.
- [x] Documenter la direction et les preuves réellement obtenues dans architecture, démarche, exigences et verification.

## Points de revue

Labels et navigation clavier, erreurs d’identité sans formulaires, pseudos/noms longs, persistance locale/thème et débordements à 360 px, invités sans action de création. Les tests existants de présence/transactions restent la preuve des règles métier.
