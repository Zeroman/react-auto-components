# AutoSearch

[English](../../auto-search.md) | [简体中文](../zh-CN/auto-search.md) | [繁體中文](../zh-TW/auto-search.md) | [日本語](../ja/auto-search.md) | [한국어](../ko/auto-search.md) | [Español](../es/auto-search.md) | **Français** | [Deutsch](../de/auto-search.md) | [Português (Brasil)](../pt-BR/auto-search.md) | [Русский](../ru/auto-search.md)

Formulaire de recherche. Il dessine un `AutoForm` et émet un `QueryNode` plus les valeurs. Un rappel de champ qui lance suit [AutoForm](auto-form.md).

`AutoSearchPanel` et `AutoSearchPanelProps` sont des alias dépréciés de `AutoSearch` et `AutoSearchProps`.

## Comportement et props

| Prop | Comportement |
| --- | --- |
| `onSearch(query, values)` | Obligatoire. **Lancer ou rejeter : le formulaire interne capture, les valeurs restent, `error.message` s'affiche. Pas de reset.** |
| `mode` | Par défaut `"instant"` : recherche à chaque modification, envoi ou réinitialisation. `"manual"` recherche uniquement à l’envoi ou à la réinitialisation. |
| `columns` | Défaut `3`. |
| `more: true` | Cache le champ jusqu'à « Plus ». Les champs cachés ne vont pas dans la requête. |

| `match` | Valeur |
| --- | --- |
| omis | `"eq"`, ou `"in"` si la valeur est un tableau. |
| `"contains"` | Sous-chaîne. `ignoreCase: true` ignore la casse. |
| `"between"` | `[from, to]`. Un scalaire avertit `RAC-FIELD-BETWEEN` et ne correspond à aucune ligne. |
| `"isNull"` | Correspond à null ou undefined. La valeur saisie est ignorée. |
| vide | `undefined`, `null`, `""` et les tableaux vides sont omis, sauf `"isNull"`. |

Reset restaure `defaultValue` puis cherche. `serializeRsql` lance `RAC-QUERY-FIELD` si le nom n'est pas `/^[\w.]+$/`.

## Préconditions

Importez `style.css` une fois. `AutoConfigProvider` est optionnel.

Importez une fois au point d’entrée de l’application `import "@zeroman.yang/react-auto-components/style.css"`. Sans feuille de styles, le mode développement signale `RAC-CSS-MISSING`.
