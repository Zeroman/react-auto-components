# Codes d'erreur

[English](../../errors.md) | [简体中文](../zh-CN/errors.md) | [繁體中文](../zh-TW/errors.md) | [日本語](../ja/errors.md) | [한국어](../ko/errors.md) | [Español](../es/errors.md) | **Français** | [Deutsch](../de/errors.md) | [Português (Brasil)](../pt-BR/errors.md) | [Русский](../ru/errors.md)

Les échecs développeur lancent `RacError` ou appellent `console.warn` en développement. Le texte est toujours en anglais.

```text
[Component] what is wrong.
Fix: what to change.
Code: RAC-…
Docs: https://github.com/Zeroman/react-auto-components/blob/main/docs/errors.md#rac-…
```

Le texte d'interface reste sur `config.t`. `userKey` est la phrase source en anglais, traduite par l'hôte. La console et l'exception restent en anglais.

## RAC-FIELD-OPTIONS

`type` vaut `select`, `select-v2`, `radio`, `checkbox` ou `cascader`, et `options` manque ou est vide.

Correctif: Passez `options` en tableau ou `(values) => Option[]`. `autocomplete` peut les omettre.

## RAC-FIELD-RANGE

`daterange` ou `datetimerange` n'a pas une valeur à deux éléments.

Correctif: Typez le champ en `[start, end]`. `dateValue` vaut `"string"` par défaut. `"timestamp"` stocke des millisecondes locales. `null` laisse le bout ouvert. Un scalaire est une erreur TypeScript. Un tableau dans le modèle compile ; le mode dev avertit si la longueur réelle n'est pas 2.

## RAC-FIELD-BETWEEN

`match: "between"` n'est pas `[from, to]`.

Correctif: Stockez une paire. Un scalaire ne correspond à aucune ligne. C'est aussi une erreur de type sur `Field<T>`.

## RAC-FIELD-CUSTOM

`type: "custom"` n'a ni `render` ni `component`.

Correctif: Passez `render(context)` ou une clé `component` de `config.fields`.

## RAC-FIELD-DUPLICATE

Deux champs ont le même `name`. `defaults` le lance au montage.

Correctif: Des noms uniques. `title`, `tip`, `append` et `button` n'ont pas de nom.

## RAC-CSS-MISSING

En développement, `--auto-text` est absent de `:root`. Sans feuille de style la page est cassée et le DOM ne l'explique pas.

Correctif: Une fois : `import "@zeroman.yang/react-auto-components/style.css"`.

## RAC-TABLE-XLSX

`export("xlsx")` sans `exportXlsx`.

Correctif: Importez `{ exportXlsx }` depuis `@zeroman.yang/react-auto-components/xlsx`. L'UI affiche la phrase traduite.

## RAC-XLSX-DEP

`exceljs` n'a pas pu être chargé. C'est une `optionalDependency`.

Correctif: `pnpm add exceljs`. CSV et JSON n'en ont pas besoin.

## RAC-TABLE-EXPORT-PAGE

Une page distante est vide avant la dernière. Aucun fichier partiel n'est enregistré.

Correctif: Renvoyez un `total` stable et les lignes de ce `pageIndex`.

## RAC-TABLE-ROWID

`rowKey` manque ou se répète sur les lignes chargées.

Correctif: Chaque ligne a une chaîne stable et unique.

## RAC-TABLE-ID

`id` est vide. La clé serait `${namespace}:table:`.

Correctif: Passez un id stable par tableau.

## RAC-COLUMN-COMPONENT

Si le `component` d’une colonne ne figure pas dans `config.columns` d’`AutoConfigProvider`, le mode développement signale `RAC-COLUMN-COMPONENT` et la cellule garde le format par défaut. Enregistrez la clé ou définissez `render`, `format` ou `sort` sur la colonne. Les fonctions de la colonne sont prioritaires.

## RAC-ROW-ACTION

Si une action de ligne n’a pas de `onClick` et que son `action` n’est pas une clé connue de `config.rowActions`, sa sélection affiche `RAC-ROW-ACTION` dans la ligne d’état. Fournissez `onClick` ou enregistrez la clé d’`action`. Si les deux existent, `onClick` est prioritaire.

## RAC-TABLE-SOURCE

`source` désigne une clé de `config.sources` dans `AutoConfigProvider`. Une clé inconnue affiche `RAC-TABLE-SOURCE` avec un bouton de nouvelle tentative. Enregistrez cette clé ou utilisez `data` / `dataSource`. Fournissez exactement une des trois options.

## RAC-TABLE-FILTER

Le JSON du filtre n'est pas une requête. Le texte traduit s'affiche et l'ancien filtre reste.

Correctif: Groupe `{ kind: "group", operator, children }`. Condition `{ kind: "condition", field, operator, value }`. `between` vaut `[from, to]`.

## RAC-QUERY-FIELD

`serializeRsql` refuse un nom hors `/^[\\w.]+$/`.

Correctif: Lettres, chiffres, underscore et points seulement.

## RAC-DIALOG-PROVIDER

`useAutoDialog()` hors de `AutoDialogProvider`.

Correctif: Enveloppez l'arbre avec `<AutoDialogProvider>`. `AutoConfigProvider` ne fournit pas les boîtes de dialogue et reste optionnel. `<AutoDialog open>` n'utilise pas ce hook.

## RAC-TABS-ROUTE-VALUE

Ne passez pas simultanément `route` et `value` à `AutoTabs`. Si les deux sont fournis, `route` est prioritaire et le mode développement affiche `RAC-TABS-ROUTE-VALUE`. Omettez `value` lorsque `AutoNavigation` contrôle la sélection.
