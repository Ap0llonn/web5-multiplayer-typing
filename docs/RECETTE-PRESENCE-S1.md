# Recette de présence S1 — story #10

La liste rend maintenant distinctement compte/invité, participant/spectateur, hôte et présence, en français et en anglais. Les données viennent du snapshot serveur existant ; aucune identité ni autorisation n’est déduite du libellé navigateur. Le composant de présentation `lobby-roster.tsx` n’accède ni à la DB ni aux sessions.

## Recette locale du 5 octobre 2026

La demande actuelle porte sur la validation **locale** de #9 et #10. Sur le checkout `main`, base `25fd45a6d2b019c95f14043e92f319336b217613` avec modifications non commitées, les **35 E2E Chromium** du vrai build de production passent. Le scénario `presence.spec.ts` mesure une arrivée en **823 ms**, une perte détectée chez l'invité en **10 413 ms** et chez l'hôte en **10 414 ms**, puis des reprises en **15 268 ms** / **14 261 ms** depuis le début des coupures. La salle, les identités, l'hôte et les deux adhésions restent les mêmes, sans rafraîchissement manuel.

Les six nouveaux tests `tests/integration/lobby-rate-limit.test.ts` couvrent aussi une présence existante après épuisement des tentatives par IP : lecture, douze heartbeats consécutifs et départ restent autorisés. Les deux E2E FR/EN de limitation prouvent qu'un refus 429 n'ajoute pas de membre, même après reload. [Rapport de cette recette](verification.md#stories-9-et-10--recette-locale-du-5-octobre-2026). Ces observations correspondent à localhost, avec comptes/invités Better Auth réels et PostgreSQL jetable ; le protocole HTTPS ci-dessous reste à exécuter à la livraison de #11.

## Correction après premier run Chromium

Le run [37136241829](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37136241829) a échoué sur la première coupure invitée : la présence restait Online pendant vingt secondes. La preuve PostgreSQL a confirmé que les observations SSE renouvelaient à tort le timestamp serveur. [ADR 0002](adr/0002-client-presence.md) sépare désormais lecture SSE et heartbeat HTTP du navigateur ; le test de réseau est conservé sans augmenter son délai ni simuler un succès. Les runs suivants [PR 37137711735](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37137711735) et [push 37137708939](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37137708939) sont verts sur `91e24c225aa169482ac4b463201958a444ce0c53` : la recette réseau inchangée passe avec mêmes identités, même hôte et aucun doublon.

## Vérification automatisée

- `tests/unit/lobby-roster.test.tsx` rend le vrai composant React avec les deux catalogues FR/EN et vérifie les deux types de personne, le rôle, l’hôte et la présence
- `tests/unit/lobby-snapshot-order.test.ts` vérifie qu’une ancienne version et le stream d’une ancienne salle ne remplacent pas l’état actuel ; une resynchronisation complète plus récente et sa duplication conservent le bon état
- `tests/e2e/presence.spec.ts` utilise deux contextes Chromium, une inscription locale réelle et un invité réel, sans simuler les réponses HTTP/SSE

Le scénario navigateur observe l’arrivée de l’invité dans le roster partagé, puis coupe réellement le réseau du contexte invité avec Playwright. L’autre navigateur doit afficher « Reconnecting » après le seuil de présence de dix secondes, tout en conservant la salle et deux adhésions. Après reprise, la présence revient sans reload ; les IDs de participation et d’hôte restent identiques. Le même scénario est ensuite répété en coupant le navigateur hôte : l’invité reste connecté et l’hôte ne change pas pendant la grâce de trente secondes. L’assertion de reprise exige moins de trente secondes depuis chaque coupure. Les durées observées d’arrivée, détection et reprise sont écrites dans le journal CI, sans cookies, tokens ou données personnelles.

Une commutation finale vers le français vérifie les libellés Compte/Invité sans dupliquer le roster. Les tests existants couvrent séparément le départ explicite, qui n’est pas une coupure réseau. Les cinq tests Chromium sont exécutés et réussis dans les deux runs ci-dessus, avec 29 unitaires et 19 intégrations PostgreSQL. Mesures du run PR : arrivée 883 ms ; invité, détection 9 858 ms / reprise 15 213 ms ; hôte, détection 10 353 ms / reprise 14 668 ms. La reprise est mesurée depuis le début de la coupure. Le navigateur local de développement reste bloqué ; la preuve navigateur vient réellement de GitHub CI.

```sh
pnpm test:unit
pnpm test:integration
pnpm build
pnpm test:browser tests/e2e/presence.spec.ts
```

## Reprise manuelle sur la cible HTTPS autorisée

1. Ouvrir deux sessions navigateur indépendantes : un compte hôte crée une salle, un invité rejoint par code ; relever code, deux lignes et libellés
2. Couper uniquement le réseau du navigateur invité, sans cliquer Quitter ; attendre son état de reconnexion chez l’hôte puis reprendre avant trente secondes
3. Vérifier même code, mêmes personnes, deux lignes seulement et mise à jour automatique ; noter délai et version déployée
4. Répéter en coupant le navigateur hôte : l’invité doit rester dans la salle et l’hôte doit conserver sa place pendant la grâce
5. Vérifier un départ explicite séparément : transfert à un autre compte admissible, sinon fermeture, selon SALLE-08
6. Refaire FR/EN et consigner navigateur, commit, URL HTTPS, délais, résultat et anomalie éventuelle sans donnée d’authentification

**Limite maintenue :** ces tests locaux/CI ne prouvent pas la cible VPS publique HTTPS, son proxy ni sa résistance à la charge. Le critère de production de #10 et les stories #11/#12 restent ouverts tant que cette recette n’est pas attestée sur le déploiement autorisé. Course, bots et cadence de course restent hors de ce lot.
