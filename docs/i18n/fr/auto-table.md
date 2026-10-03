# AutoTable

[English](../../auto-table.md) | [简体中文](../zh-CN/auto-table.md) | [繁體中文](../zh-TW/auto-table.md) | [日本語](../ja/auto-table.md) | [한국어](../ko/auto-table.md) | [Español](../es/auto-table.md) | **Français** | [Deutsch](../de/auto-table.md) | [Português (Brasil)](../pt-BR/auto-table.md) | [Русский](../ru/auto-table.md)

Tableau local ou distant. Fournissez exactement un de `data`, `dataSource` ou `source` ; en combiner plusieurs est une erreur de type. La recherche suit [AutoSearch](auto-search.md). Ajout et édition suivent [AutoDialog](auto-dialog.md) et [AutoForm](auto-form.md).

`exportXlsx` vient de `@zeroman.yang/react-auto-components/xlsx`. `exceljs` est optionnel (`RAC-XLSX-DEP` s'il manque).

## Comportement et props

| Prop | Comportement |
| --- | --- |
| `id` | Obligatoire. La clé est `${namespace}:table:${id}`. Vide : `RAC-TABLE-ID`. |
| `rowKey` | Unique sur les lignes chargées. Manquant ou doublon : `RAC-TABLE-ROWID`. Sélection, expansion et `scrollToRow` l'utilisent. |
| `dataSource` | **Rejeter : message et bouton réessayer. L'abandon est ignoré.** `total` est le compte filtré complet, pas la longueur de la page. |
| `pageSize` | Défaut `10`. `pagination` défaut `true`. `height` défaut `440`. `"auto"` remplit un parent qui a déjà une hauteur. |
| `onAdd`, `onEdit`, `onDelete` | **Rejeter ou lancer : la boîte reste ouverte et montre `error.message`.** Les lignes ne changent que si votre handler les a déjà changées. |
| `rowActions` | Le rejet de `onClick` est intercepté et affiché dans la ligne d’état pendant environ 2,5 secondes. La ligne reste présente. Si une action de ligne n’a pas de `onClick` et que son `action` n’est pas une clé connue de `config.rowActions`, sa sélection affiche `RAC-ROW-ACTION` dans la ligne d’état. Fournissez `onClick` ou enregistrez la clé d’`action`. Si les deux existent, `onClick` est prioritaire. |
| `component` | Si le `component` d’une colonne ne figure pas dans `config.columns` d’`AutoConfigProvider`, le mode développement signale `RAC-COLUMN-COMPONENT` et la cellule garde le format par défaut. Enregistrez la clé ou définissez `render`, `format` ou `sort` sur la colonne. Les fonctions de la colonne sont prioritaires. |
| `source` | `source` désigne une clé de `config.sources` dans `AutoConfigProvider`. Une clé inconnue affiche `RAC-TABLE-SOURCE` avec un bouton de nouvelle tentative. Enregistrez cette clé ou utilisez `data` / `dataSource`. Fournissez exactement une des trois options. |
| `exportXlsx` | Nécessaire seulement pour xlsx. Absent : `RAC-TABLE-XLSX`. CSV et JSON sont intégrés. |
| `toolbarActions` | Actualiser, réglages, export et JSON. Tous affichés par défaut. `false` masque les quatre boutons. Un objet masque seulement ceux à `false`. `handle.refresh()` et `handle.export()` restent disponibles. Le libellé JSON est la chaîne traduite `"JSON"`. |

`handle.export` résout même si l'état montre une erreur ; il ne relance pas. `"filtered"` distant parcourt toutes les pages. Une page vide avant la dernière lance `RAC-TABLE-EXPORT-PAGE` et ne télécharge pas de fichier partiel.

Un JSON de filtre invalide montre le texte traduit, avertit `RAC-TABLE-FILTER` et garde le filtre précédent. `between` a la longueur 2. `in` est un tableau.

`handle.reset()` efface tri, filtre et sélection et remet la disposition sur les colonnes. `scrollToRow` ne fait rien si l'id n'est pas chargé.

## Préconditions

Importez `style.css` une fois. Séparez `namespace` si plusieurs applications sur la même origine persistent des tableaux ; le défaut est `"auto"`. Les boîtes d'ajout et d'édition n'ont pas besoin de `AutoDialogProvider`. Seul `useAutoDialog()` en a besoin.
