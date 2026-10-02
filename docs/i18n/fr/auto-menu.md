# AutoMenu

[English](../../auto-menu.md) | [简体中文](../zh-CN/auto-menu.md) | [繁體中文](../zh-TW/auto-menu.md) | [日本語](../ja/auto-menu.md) | [한국어](../ko/auto-menu.md) | [Español](../es/auto-menu.md) | **Français** | [Deutsch](../de/auto-menu.md) | [Português (Brasil)](../pt-BR/auto-menu.md) | [Русский](../ru/auto-menu.md)

Barre latérale. Pour des panneaux, [AutoTabs](auto-tabs.md).

## Comportement et props

| Prop | Comportement |
| --- | --- |
| `items` | `id` unique dans l'arbre. `hidden` et un `canAccess` refusé écartent l'entrée. Un `children` qui pointe vers un ancêtre est écarté en entier pour qu'un mauvais schéma ne parte pas en récursion. |
| `value` | Id de la feuille choisie. Omis : la sélection reste interne. |
| `onChange(id, item, path)` | **Non capturé.** `path` est la chaîne d'ids de la racine à la feuille. Un parent avec enfants bascule l'expansion et n'est pas sélectionné. |
| `collapsible` | Défaut `false`. Si `collapsed` est contrôlé, mettez-le à jour dans `onCollapsedChange` sinon le rail ne bouge pas. **`onCollapsedChange` n'est pas capturé.** |
| `disabled` | Désactive l'entrée et ses descendants. La sélection les saute. |

Choisir une feuille ne navigue pas tout seul. Le seul signal est `onChange`.

## Préconditions

Importez `style.css` une fois. `AutoConfigProvider` est optionnel. Les permissions passent par `config.canAccess`.

Importez une fois au point d’entrée de l’application `import "@zeroman.yang/react-auto-components/style.css"`. Sans feuille de styles, le mode développement signale `RAC-CSS-MISSING`.
