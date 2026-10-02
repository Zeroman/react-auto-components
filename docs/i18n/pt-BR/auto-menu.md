# AutoMenu

[English](../../auto-menu.md) | [简体中文](../zh-CN/auto-menu.md) | [繁體中文](../zh-TW/auto-menu.md) | [日本語](../ja/auto-menu.md) | [한국어](../ko/auto-menu.md) | [Español](../es/auto-menu.md) | [Français](../fr/auto-menu.md) | [Deutsch](../de/auto-menu.md) | **Português (Brasil)** | [Русский](../ru/auto-menu.md)

Barra lateral. Para painéis, [AutoTabs](auto-tabs.md).

## Comportamento e props

| Prop | Comportamento |
| --- | --- |
| `items` | `id` único na árvore. `hidden` e um `canAccess` que falha descartam o item. Um `children` que aponta para um ancestral é descartado por inteiro para um esquema ruim não recursar. |
| `value` | Id da folha selecionada. Omitido, a seleção fica interna. |
| `onChange(id, item, path)` | **Não é capturado.** `path` é a cadeia de ids da raiz até a folha. Um pai com filhos só alterna a expansão e não é selecionado. |
| `collapsible` | Padrão `false`. Se `collapsed` for controlado, atualize-o em `onCollapsedChange` ou o trilho não se move. **`onCollapsedChange` não é capturado.** |
| `disabled` | Desabilita o item e os descendentes. A seleção os pula. |

Escolher uma folha não navega sozinho. O único sinal é `onChange`.

## Pré-condições

Importe `style.css` uma vez. `AutoConfigProvider` é opcional. Permissões usam `config.canAccess`.

Importe uma vez na entrada do aplicativo `import "@zeroman.yang/react-auto-components/style.css"`. Sem a folha de estilos, o modo de desenvolvimento avisa com `RAC-CSS-MISSING`.
