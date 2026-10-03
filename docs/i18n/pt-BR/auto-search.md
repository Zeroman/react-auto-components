# AutoSearch

[English](../../auto-search.md) | [简体中文](../zh-CN/auto-search.md) | [繁體中文](../zh-TW/auto-search.md) | [日本語](../ja/auto-search.md) | [한국어](../ko/auto-search.md) | [Español](../es/auto-search.md) | [Français](../fr/auto-search.md) | [Deutsch](../de/auto-search.md) | **Português (Brasil)** | [Русский](../ru/auto-search.md)

Formulário de busca. Desenha um `AutoForm` e emite um `QueryNode` e os valores. Se um callback de campo lançar, valem as regras de [AutoForm](auto-form.md).

`AutoSearchPanel` e `AutoSearchPanelProps` são aliases obsoletos de `AutoSearch` e `AutoSearchProps`.

## Comportamento e props

| Prop | Comportamento |
| --- | --- |
| `onSearch(query, values)` | Obrigatório. **Lançar ou rejeitar: o formulário interno captura, os valores ficam e `error.message` aparece. Sem reset.** |
| `mode` | Padrão `"instant"`: busca ao alterar, enviar ou redefinir. `"manual"` busca apenas ao enviar ou redefinir. |
| `columns` | Padrão `3`. |
| `more: true` | Esconde o campo até abrir "Mais". Campos ocultos não entram na consulta. |

| `match` | Valor |
| --- | --- |
| omitido | `"eq"`, ou `"in"` se o valor for um array. |
| `"contains"` | Substring. `ignoreCase: true` ignora maiúsculas. |
| `"between"` | `[from, to]`. Um escalar avisa `RAC-FIELD-BETWEEN` e não casa com linhas. |
| `"isNull"` | Casa com null ou undefined. O valor digitado é ignorado. |
| vazio | `undefined`, `null`, `""` e arrays vazios são omitidos, salvo `"isNull"`. |

O reset restaura `defaultValue` e então busca. `serializeRsql` lança `RAC-QUERY-FIELD` se o nome não cumprir `/^[\w.]+$/`.

## Pré-condições

Importe `style.css` uma vez. `AutoConfigProvider` é opcional.

Importe uma vez na entrada do aplicativo `import "@zeroman.yang/react-auto-components/style.css"`. Sem a folha de estilos, o modo de desenvolvimento avisa com `RAC-CSS-MISSING`.
