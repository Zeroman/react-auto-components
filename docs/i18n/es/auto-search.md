# AutoSearch

[English](../../auto-search.md) | [简体中文](../zh-CN/auto-search.md) | [繁體中文](../zh-TW/auto-search.md) | [日本語](../ja/auto-search.md) | [한국어](../ko/auto-search.md) | **Español** | [Français](../fr/auto-search.md) | [Deutsch](../de/auto-search.md) | [Português (Brasil)](../pt-BR/auto-search.md) | [Русский](../ru/auto-search.md)

Formulario de búsqueda. Dibuja un `AutoForm` y emite un `QueryNode` y los valores. Si un callback de campo lanza, valen las reglas de [AutoForm](auto-form.md).

`AutoSearchPanel` y `AutoSearchPanelProps` son alias en desuso de `AutoSearch` y `AutoSearchProps`.

## Comportamiento y props

| Prop | Comportamiento |
| --- | --- |
| `onSearch(query, values)` | Obligatorio. **Lanzar o rechazar: el formulario interno lo captura, los valores se quedan y se muestra `error.message`. No hay reset.** |
| `mode` | Por defecto `"instant"`: busca al cambiar, enviar o restablecer. `"manual"` busca solo al enviar o restablecer. |
| `columns` | Por defecto `3`. |
| `more: true` | Oculta el campo hasta abrir "Más". Los campos ocultos no entran en la consulta. |

| `match` | Valor |
| --- | --- |
| omitido | `"eq"`, o `"in"` si el valor es un array. |
| `"contains"` | Subcadena. `ignoreCase: true` ignora mayúsculas. |
| `"between"` | `[from, to]`. Un escalar avisa `RAC-FIELD-BETWEEN` y no coincide con filas. |
| `"isNull"` | Coincide con null o undefined. El valor escrito se ignora. |
| vacío | `undefined`, `null`, `""` y arrays vacíos se omiten, salvo `"isNull"`. |

El reset restaura `defaultValue` y luego busca. `serializeRsql` lanza `RAC-QUERY-FIELD` si el nombre no cumple `/^[\w.]+$/`.

## Precondiciones

Importa `style.css` una vez. `AutoConfigProvider` es opcional.

Importa una vez en la entrada de la aplicación `import "@zeroman.yang/react-auto-components/style.css"`. Si falta la hoja de estilos, el desarrollo avisa con `RAC-CSS-MISSING`.
