# Boîtes mystères pendant la course

Demande et accord utilisateur du 8 novembre 2026 : six effets approuvés, aide aux **retardataires**, implémentation autorisée dans la conversation.

## Contrat

Propriétaire : `lobby`, exigences BONUS-01–04, CONF-09 et résultats RES-02. Le serveur attribue une boîte au dernier (égalités incluses, sauf égalité avec le meneur) ou à une personne à **plus de 25 points** du meneur, à chacun des checkpoints du meneur **25/50/75 %**, une seule fois, maximum **3** par course. Les abandons et spectateurs sont exclus. Les checkpoints sont monotones et utilisent la progression proportionnelle au texte personnel.

La boîte dévoile un objet conservé jusqu'au clic d'activation ; chaque objet ne peut agir qu'une fois. Raccourci retire jusqu'à trois mots non commencés, détour ajoute trois mots au meneur encore en course, brouillard masque temporairement ses mots futurs pendant quatre secondes, bouclier bloque le prochain malus jusqu'à son utilisation, éclaircie dissipe son propre brouillard, petit coup de pouce retire un mot non commencé. Ni suppression du texte commencé ni fausses frappes correctes. On conserve au moins le mot courant ; une aide ne termine donc pas automatiquement une course.

Le tirage pondéré et reproductible depuis l'ID serveur de course privilégie raccourci/détour/brouillard ; éclaircie n'est tirée que sous brouillard, les attaques seulement avec une cible active distincte. L'activation réévalue la cible et l'utilité ; un effet devenu inutile est refusé sans consommation. Les boîtes déjà reçues restent utilisables après un changement de rang. Un joueur en tête n'en reçoit pas de nouvelle. L'hôte peut désactiver les bonus avant la course.

Les textes personnels ont une révision serveur : un lot de frappes préparé avant modification est refusé puis resynchronisé sans compter de fausses erreurs. Les MPM et la précision comptent uniquement les frappes ; la piste et le classement utilisent `progress / targetLength`. Les événements sont annoncés sur la piste et chez la cible en FR/EN, thèmes clair/sombre, sans dépendance à l'animation.

## Approches

Le choix approuvé est une aide de remontée aux checkpoints du cahier des charges. Une distribution à tout le monde favorisant aussi les premiers ne correspond pas à la correction utilisateur. Une simple animation locale ne remplirait ni BONUS-01 ni l'autorité serveur.

Pas de nouveau module ni de transport. La transaction et l'agrégat JSON existants conservent objets, événements et révisions ; les anciennes courses sont lues avec bonus désactivés pour compatibilité. Une migration additive conserve le nombre de bonus dans les résultats comptes. Bots, nouvelle marque et déploiement restent hors périmètre.

## Choix d'implémentation

Ces détails (durée de quatre secondes, activation manuelle, poids et compatibilité) sont des choix de réalisation de l'agent, à tester ; ils ne sont pas présentés comme des demandes textuelles de l'utilisateur. L'arbre existant contient une course humaine non commitée : la prolonger sans écraser ni commiter ces travaux.
