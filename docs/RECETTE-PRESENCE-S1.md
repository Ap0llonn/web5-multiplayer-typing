# Recette de présence S1 — story #10

La liste rend maintenant distinctement compte/invité, participant/spectateur, hôte et présence, en français et en anglais. Les données viennent du snapshot serveur existant ; aucune identité ni autorisation n’est déduite du libellé navigateur. Le composant de présentation `lobby-roster.tsx` n’accède ni à la DB ni aux sessions.

## Correction après premier run Chromium

Le run [37136241829](https://github.com/Ap0llonn/web5-multiplayer-typing/actions/runs/37136241829) a échoué sur la première coupure invitée : la présence restait Online pendant vingt secondes. La preuve PostgreSQL a confirmé que les observations SSE renouvelaient à tort le timestamp serveur. [ADR 0002](adr/0002-client-presence.md) sépare désormais lecture SSE et heartbeat HTTP du navigateur ; le test de réseau est conservé sans augmenter son délai ni simuler un succès. Le prochain run CI doit confirmer la recette complète et ses durées.

## Vérification automatisée

- `tests/unit/lobby-roster.test.tsx` rend le vrai composant React avec les deux catalogues FR/EN et vérifie les deux types de personne, le rôle, l’hôte et la présence
- `tests/unit/lobby-snapshot-order.test.ts` vérifie qu’une ancienne version et le stream d’une ancienne salle ne remplacent pas l’état actuel ; une resynchronisation complète plus récente et sa duplication conservent le bon état
- `tests/e2e/presence.spec.ts` utilise deux contextes Chromium, une inscription locale réelle et un invité réel, sans simuler les réponses HTTP/SSE

Le scénario navigateur observe l’arrivée de l’invité dans le roster partagé, puis coupe réellement le réseau du contexte invité avec Playwright. L’autre navigateur doit afficher « Reconnecting » après le seuil de présence de dix secondes, tout en conservant la salle et deux adhésions. Après reprise, la présence revient sans reload ; les IDs de participation et d’hôte restent identiques. Le même scénario est ensuite répété en coupant le navigateur hôte : l’invité reste connecté et l’hôte ne change pas pendant la grâce de trente secondes. L’assertion de reprise exige moins de trente secondes depuis chaque coupure. Les durées observées d’arrivée, détection et reprise sont écrites dans le journal CI, sans cookies, tokens ou données personnelles.

Une commutation finale vers le français vérifie les libellés Compte/Invité sans dupliquer le roster. Les tests existants couvrent séparément le départ explicite, qui n’est pas une coupure réseau. L’essai de cinq tests Chromium sur cette branche reste à confirmer par son run CI ; la collecte locale des tests n’est pas une exécution navigateur.

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
