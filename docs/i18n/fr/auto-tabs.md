# AutoTabs

[English](../../auto-tabs.md) | [简体中文](../zh-CN/auto-tabs.md) | [繁體中文](../zh-TW/auto-tabs.md) | [日本語](../ja/auto-tabs.md) | [한국어](../ko/auto-tabs.md) | [Español](../es/auto-tabs.md) | **Français** | [Deutsch](../de/auto-tabs.md) | [Português (Brasil)](../pt-BR/auto-tabs.md) | [Русский](../ru/auto-tabs.md)

Onglets. L'imbrication est un autre `AutoTabs` nourri par `children`. Pour une barre latérale, [AutoMenu](auto-menu.md).

## Comportement et props

| Prop | Comportement |
| --- | --- |
| `items` | Chaque onglet a un `id` stable. `hidden` et un `canAccess` refusé le retirent. |
| `value` | Chemin contrôlé d'ids depuis la racine. L'imbrication est `["parent", "child"]`. |
| `onChange(path, item)` | **Non capturé.** S'il lance, React signale l'erreur. En mode contrôlé, le chemin non validé reste le précédent. |
| `mode` | Défaut `"horizontal"`. `"vertical"` empile la liste. |
| `keepMounted` | Défaut `true` : les panneaux inactifs restent montés. `false` les démonte. |
| `onRefresh` | S'il est défini, un bouton d'actualisation apparaît. **Non capturé.** |
| `disabled` | Reste visible et ne peut pas être choisi. La sélection par défaut saute les onglets désactivés. |

Ne passez pas simultanément `route` et `value` à `AutoTabs`. Si les deux sont fournis, `route` est prioritaire et le mode développement affiche `RAC-TABS-ROUTE-VALUE`. Omettez `value` lorsque `AutoNavigation` contrôle la sélection.

## Préconditions

Importez `style.css` une fois (`RAC-CSS-MISSING` en développement). `AutoConfigProvider` est optionnel.

## Onglets dynamiques

`useAutoTabsWorkspace` ouvre et ferme des pages sans routeur. Passez `tabsProps` à `AutoTabs`. Rappeler `open` avec le même id sélectionne seulement cet onglet et garde le brouillon. Un onglet épinglé ne se ferme pas. Attendez `ready` avant `open`. La sélection, `params` et `state` reviennent de `sessionStorage` après le montage. Si `beforeClose` renvoie `false` ou lance, la fermeture est annulée. L'exemple est dans [DynamicTabsDemo.tsx](../../../test-project/src/examples/DynamicTabsDemo.tsx).
