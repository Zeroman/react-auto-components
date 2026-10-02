# AutoTabs

[English](../../auto-tabs.md) | [简体中文](../zh-CN/auto-tabs.md) | [繁體中文](../zh-TW/auto-tabs.md) | [日本語](../ja/auto-tabs.md) | [한국어](../ko/auto-tabs.md) | [Español](../es/auto-tabs.md) | [Français](../fr/auto-tabs.md) | [Deutsch](../de/auto-tabs.md) | **Português (Brasil)** | [Русский](../ru/auto-tabs.md)

Abas. As aninhadas são outro `AutoTabs` alimentado por `children`. Para uma barra lateral, [AutoMenu](auto-menu.md).

## Comportamento e props

| Prop | Comportamento |
| --- | --- |
| `items` | Cada aba precisa de um `id` estável. `hidden` e um `canAccess` que falha removem a aba. |
| `value` | Caminho controlado de ids a partir da raiz. O aninhado é `["parent", "child"]`. |
| `onChange(path, item)` | **Não é capturado.** Se lançar, o React reporta o erro. No modo controlado, o caminho ainda não confirmado fica no anterior. |
| `mode` | Padrão `"horizontal"`. `"vertical"` empilha a lista. |
| `keepMounted` | Padrão `true`: painéis inativos continuam montados. `false` desmonta. |
| `onRefresh` | Se existir, há um botão de atualizar. **Não é capturado.** |
| `disabled` | Continua visível e não pode ser escolhida. A seleção padrão pula abas desabilitadas. |

## Pré-condições

Importe `style.css` uma vez (`RAC-CSS-MISSING` em desenvolvimento). `AutoConfigProvider` é opcional.

## Abas dinâmicas

`useAutoTabsWorkspace` abre e fecha páginas sem um router. Passe `tabsProps` para `AutoTabs`. Chamar `open` de novo com o mesmo id só seleciona essa aba e mantém o rascunho. Uma aba fixada não fecha. Espere `ready` antes de `open`. A seleção, `params` e `state` voltam do `sessionStorage` após a montagem. Se `beforeClose` retornar `false` ou lançar, o fechamento é cancelado. O exemplo está em [DynamicTabsDemo.tsx](../../../test-project/src/examples/DynamicTabsDemo.tsx).
