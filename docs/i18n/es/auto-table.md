# AutoTable

[English](../../auto-table.md) | [简体中文](../zh-CN/auto-table.md) | [繁體中文](../zh-TW/auto-table.md) | [日本語](../ja/auto-table.md) | [한국어](../ko/auto-table.md) | **Español** | [Français](../fr/auto-table.md) | [Deutsch](../de/auto-table.md) | [Português (Brasil)](../pt-BR/auto-table.md) | [Русский](../ru/auto-table.md)

Tabla local o remota. Pasa exactamente uno de `data`, `dataSource` o `source`; combinar varios es un error de tipo. La búsqueda sigue [AutoSearch](auto-search.md). Alta y edición siguen [AutoDialog](auto-dialog.md) y [AutoForm](auto-form.md).

`exportXlsx` se importa de `@zeroman.yang/react-auto-components/xlsx`. `exceljs` es opcional (`RAC-XLSX-DEP` si falta).

## Comportamiento y props

| Prop | Comportamiento |
| --- | --- |
| `id` | Obligatorio. La clave es `${namespace}:table:${id}`. Vacío avisa `RAC-TABLE-ID`. |
| `rowKey` | Único en las filas cargadas. Falta o duplicado avisa `RAC-TABLE-ROWID`. Lo usan la selección, la expansión y `scrollToRow`. |
| `dataSource` | **Rechazar: se muestra el mensaje y un botón de reintento. El abort se ignora.** `total` es el recuento filtrado completo, no el largo de la página. |
| `pageSize` | Por defecto `10`. `pagination` por defecto `true`. `height` por defecto `440`. `"auto"` llena un padre que ya tiene altura. |
| `onAdd`, `onEdit`, `onDelete` | **Rechazar o lanzar: el diálogo sigue abierto y muestra `error.message`.** Las filas no cambian salvo que tu handler ya las haya cambiado. |
| `rowActions` | El rechazo de `onClick` se captura y se muestra en la línea de estado durante unos 2,5 segundos. La fila permanece. Si una acción de fila no tiene `onClick` y su `action` no es una clave conocida de `config.rowActions`, al seleccionarla la línea de estado muestra `RAC-ROW-ACTION`. Proporciona `onClick` o registra la clave de `action`. Si existen ambos, prevalece `onClick`. |
| `component` | Si el `component` de una columna no está registrado en `config.columns` de `AutoConfigProvider`, el desarrollo avisa con `RAC-COLUMN-COMPONENT` y la celda conserva el formato predeterminado. Registra la clave o define `render`, `format` o `sort` en la columna. Las funciones de la columna tienen prioridad. |
| `source` | `source` es una clave de `config.sources` en `AutoConfigProvider`. Una clave desconocida muestra `RAC-TABLE-SOURCE` con un botón para reintentar. Registra la clave o usa `data` / `dataSource`. Proporciona exactamente una de las tres opciones. |
| `exportXlsx` | Solo hace falta para xlsx. Si falta, `RAC-TABLE-XLSX`. CSV y JSON van incluidos. |

`handle.export` resuelve aunque el estado muestre un error; no relanza. `"filtered"` remoto recorre todas las páginas. Una página vacía antes de la última lanza `RAC-TABLE-EXPORT-PAGE` y no descarga un archivo parcial.

Un JSON de filtro inválido muestra el texto traducido, avisa `RAC-TABLE-FILTER` y conserva el filtro anterior. `between` debe tener longitud 2. `in` debe ser un array.

`handle.reset()` limpia orden, filtro y selección y devuelve el diseño a las columnas. `scrollToRow` no hace nada si ese id no está cargado.

## Precondiciones

Importa `style.css` una vez. Separa `namespace` si varias apps del mismo origen persisten tablas; el valor por defecto es `"auto"`. Los diálogos de alta y edición no necesitan `AutoDialogProvider`. Solo `useAutoDialog()` lo necesita.
