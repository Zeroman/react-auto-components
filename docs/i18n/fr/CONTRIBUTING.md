# Contribuer

[English](../../../.github/CONTRIBUTING.md) | [简体中文](../zh-CN/CONTRIBUTING.md) | [繁體中文](../zh-TW/CONTRIBUTING.md) | [日本語](../ja/CONTRIBUTING.md) | [한국어](../ko/CONTRIBUTING.md) | [Español](../es/CONTRIBUTING.md) | **Français** | [Deutsch](../de/CONTRIBUTING.md) | [Português (Brasil)](../pt-BR/CONTRIBUTING.md) | [Русский](../ru/CONTRIBUTING.md)

Utilisez les Issues pour signaler des problèmes reproductibles ou proposer des fonctionnalités, et les Pull Requests pour contribuer des améliorations.

## Développement local

Nécessite Node.js >=22.12.0 et pnpm 12.5.1. La version du gestionnaire de paquets est fixée dans le champ packageManager de package.json.

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

Le projet consommateur installe la bibliothèque depuis une véritable archive tarball. Après avoir modifié la bibliothèque, exécutez de nouveau `pnpm prepare:test-project`. Conservez cette procédure fondée sur le paquet au lieu d’introduire des alias vers les sources. N’ajoutez pas d’artefacts, de node_modules ni de journaux d’exécution aux commits.

## Vérification

```sh
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
```

L’intégration continue exécute ces vérifications sous Linux. Les tests dans le navigateur utilisent automatiquement le port 4174 ; la démonstration de développement utilise le port 4173.

## Répertoires

- `src/components` : les sept composants et leurs types publics.
- `src/core` : configuration, fournisseurs, requêtes et types partagés.
- `src/adapters` : l’adaptateur XLSX facultatif.
- `src/styles` : les styles des composants, importés explicitement.
- `tests` : tests unitaires et tests négatifs de typage.
- `test-project` : le projet consommateur autonome et les tests d’interaction Chromium.
- `scripts` : scripts de création de paquet et de préparation du projet consommateur.

## Pull Requests

Décrivez le problème, le comportement obtenu et les vérifications que vous avez réellement exécutées. Lors de la correction d’un bug de composant, ajoutez un test de non-régression qui reproduit le problème. Mettez à jour la documentation lorsque les API publiques ou leur utilisation changent. Gardez des modifications ciblées et évitez les changements de mise en forme sans rapport dans l’ensemble du dépôt.

Respectez les paramètres TypeScript stricts et le style de code existants. React 19 reste une dépendance homologue, les styles utilisent un point d’entrée séparé et XLSX reste exclu du point d’entrée principal. Les contributions sont fournies sous la licence MIT de ce dépôt.

## Traductions de la documentation

Les documents anglais utilisent leurs noms de fichiers par défaut. Les traductions sont regroupées par locale sous `docs/i18n/<locale>/`, par exemple `docs/i18n/ja/README.md` et `docs/i18n/zh-CN/migration.md`. Conservez les mêmes sections, exemples, sens technique et statut de publication dans toutes les langues. Préservez les identifiants publics et les arguments de commande. Lors de la mise à jour d'un document, mettez à jour ses traductions et maintenez la cohérence des liens de changement de langue ainsi que des liens vers les documents connexes.
