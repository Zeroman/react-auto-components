# Journal des modifications

[English](../../CHANGELOG.md) | [简体中文](../zh-CN/CHANGELOG.md) | [繁體中文](../zh-TW/CHANGELOG.md) | [日本語](../ja/CHANGELOG.md) | [한국어](../ko/CHANGELOG.md) | [Español](../es/CHANGELOG.md) | **Français** | [Deutsch](../de/CHANGELOG.md) | [Português (Brasil)](../pt-BR/CHANGELOG.md) | [Русский](../ru/CHANGELOG.md)

## Non publié

## 0.1.4 - 2026-10-03

- Ajout de `AutoNavigation`. Les composants montés s'inscrivent dans un arbre de chemins. `goto` accepte les chemins relatifs, les contrôles d'accès et un signal d'abandon. Seules les positions validées sont synchronisées avec l'historique hash, navigateur ou mémoire. `AutoMenu` et `AutoTabs` acceptent `route` et suivent l'enfant actif.
- Ajout de `AutoTip` et `DefaultTip`. Les aides des champs, colonnes, menus et onglets flottent. Les types d'affichage `tip` et `append` restent en ligne. Le composant de l'élément l'emporte, puis celui du composant propriétaire, puis `config.form`, `config.table`, `config.tabs` ou `config.menu`, puis `config.tipComponent`.
- `mode` de `AutoSearch` vaut `"instant"` par défaut. Les champs masqués et ceux qui échouent à `canAccess` restent dans les valeurs et sont absents de la requête. Les options de recherche se placent sur `search` ; les anciennes props `match` de premier niveau fonctionnent encore.
- `toolbarActions` de `AutoTable` affiche ou masque Actualiser, Réglages, Exporter et JSON. `handle.refresh()` et `handle.export()` restent disponibles. Les pastilles de tri n'apparaissent qu'à partir de deux colonnes triées.
- Les formulaires acceptent les emplacements `classNames` et `styles`, un élément `divider` et `virtual-select`.

## 0.1.3 - 2026-10-02

- Le texte d'interface intégré est en anglais par défaut, et cette chaîne est la clé de `config.t`. Passez `t` pour les autres langues. Les anciennes clés chinoises, comme `提交` et `刷新`, ne sont plus les valeurs par défaut.
- Le formulaire de recherche est `AutoSearch` (`AutoSearchProps`). `AutoSearchPanel` et `AutoSearchPanelProps` restent des alias dépréciés.
- `Field<T>` est une union discriminée. Un `select` sans `options`, un scalaire sur `daterange` ou `datetimerange`, et `match: "between"` sur un scalaire sont des erreurs TypeScript. `AnyField` et `unsafeField()` restent la sortie de secours.
- Les erreurs développeur sont des `RacError` en anglais, avec le composant, le correctif et un code. Voir [errors.md](errors.md). Le mode développement signale une feuille de style absente, un id de tableau vide, des `rowKey` en double, un champ de choix sans options, et une plage qui n'est pas une paire.
- `AutoConfigProvider` accepte des registres JSON : `config.fields`, `config.columns`, `config.rowActions` et `config.sources`. Une clé résout `Field.component`, `render` / `format` / `sort` / `exportFormat` de la colonne, `RowAction.action` et `source` d'`AutoTable`. Une fonction sur le champ, la colonne ou l'action l'emporte. Les providers imbriqués fusionnent, et la clé la plus récente gagne. Passez exactement un de `data`, `dataSource` ou `source`. Une source inconnue affiche `RAC-TABLE-SOURCE` et un nouvel essai.
- Ajout de `data-testid="rac-*"` stables pour les champs, tableaux, recherche, formulaires et dialogues. Ils ne suivent pas le libellé traduit.
- `useAutoTabsWorkspace` ouvre, active et ferme des onglets dynamiques, avec onglets épinglés et stockage de session facultatif. Un onglet peut être `closable`, `lazy`, `disabled` ou `loading`.
- Contrats : [AutoForm](auto-form.md), [AutoSearch](auto-search.md), [AutoTable](auto-table.md), [AutoDialog](auto-dialog.md), [AutoTabs](auto-tabs.md), [AutoMenu](auto-menu.md). `llms.txt` à la racine du paquet est l'entrée pour les agents.
- Une étiquette `v*` publie sur npm via le trusted publishing de GitHub Actions. `./run.sh release` incrémente le correctif sur un `main` propre.

## 0.1.2 - 2026-10-01

- Publication sous le nom `@zeroman.yang/react-auto-components`. Le scope npm `@zeroman` appartient à un autre compte.

- Ajout d'AutoChat avec rendu des messages contrôlé par l'appelant, suivi de flux, ancrage d'historique, composeur optionnel et démo en dix langues ; aucune nouvelle dépendance d'exécution.
- La démo en ligne affiche désormais le code source réel de chaque exemple dans un dialogue « Voir le code », avec onglets de fichiers, copie en un clic et liens GitHub.
- Composants React 19 pilotés par des schémas : AutoForm, AutoSearchPanel, AutoTable, AutoDialog, AutoTabs et AutoMenu.
- Taille et densité globales, dispositions des libellés de formulaire, paramètres de tableau persistants et exportation XLSX facultative.
- Projet consommateur utilisant une véritable archive tarball, tests unitaires, vérifications de types et tests d’interaction Chromium.
- Licence MIT, guide de contribution, intégration continue GitHub, modèles d’issues et instructions de création de compte npm et de publication.
- Documentation en anglais par défaut, avec des traductions complètes et des liens de changement de langue.
