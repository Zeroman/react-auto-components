# Códigos de error

[English](../../errors.md) | [简体中文](../zh-CN/errors.md) | [繁體中文](../zh-TW/errors.md) | [日本語](../ja/errors.md) | [한국어](../ko/errors.md) | **Español** | [Français](../fr/errors.md) | [Deutsch](../de/errors.md) | [Português (Brasil)](../pt-BR/errors.md) | [Русский](../ru/errors.md)

Los fallos de desarrollo lanzan `RacError` o llaman a `console.warn` en desarrollo. El texto siempre es inglés.

```text
[Component] what is wrong.
Fix: what to change.
Code: RAC-…
Docs: https://github.com/Zeroman/react-auto-components/blob/main/docs/errors.md#rac-…
```

Las frases de la interfaz siguen en `config.t`. `userKey` es la frase fuente en inglés que el anfitrión traduce. La consola y la excepción quedan en inglés.

## RAC-FIELD-OPTIONS

`type` es `select`, `select-v2`, `radio`, `checkbox` o `cascader`, y falta `options` o es un array vacío.

Arreglo: Pasa `options` como array o `(values) => Option[]`. `autocomplete` puede omitirlas: es un texto con sugerencias opcionales.

## RAC-FIELD-RANGE

`daterange` o `datetimerange` no tiene un valor de dos elementos.

Arreglo: Tipa el campo como `[start, end]`. `dateValue` por defecto es `"string"` (`YYYY-MM-DD`). `"timestamp"` guarda milisegundos locales. `null` deja el extremo abierto. Un escalar es un error de TypeScript. Un array en el modelo compila; en desarrollo se avisa si la longitud real no es 2.

## RAC-FIELD-BETWEEN

`match: "between"` no es `[from, to]`.

Arreglo: Guarda una tupla de dos. Un escalar no coincide con ninguna fila. En `Field<T>` también es un error de tipo.

## RAC-FIELD-CUSTOM

`type: "custom"` no tiene `render` ni `component`.

Arreglo: Pasa `render(context)` o `component` con una clave de `config.fields`.

## RAC-FIELD-DUPLICATE

Dos campos comparten `name`. `defaults` lo lanza al montar.

Arreglo: Nombres únicos. `title`, `tip`, `append` y `button` no tienen nombre y no se comprueban.

## RAC-CSS-MISSING

En desarrollo `--auto-text` no está en `:root`. Sin la hoja de estilos la página se ve rota y el DOM no dice por qué.

Arreglo: Una vez: `import "@zeroman.yang/react-auto-components/style.css"`.

## RAC-TABLE-XLSX

`export("xlsx")` sin `exportXlsx`.

Arreglo: Importa `{ exportXlsx }` desde `@zeroman.yang/react-auto-components/xlsx` y pásalo. La UI muestra la frase traducida.

## RAC-XLSX-DEP

No se pudo cargar `exceljs`. Es una `optionalDependency`.

Arreglo: `pnpm add exceljs`. CSV y JSON no lo necesitan.

## RAC-TABLE-EXPORT-PAGE

Una página remota llegó vacía antes de la última. No se guarda un archivo parcial.

Arreglo: Devuelve un `total` estable y las filas de ese `pageIndex`.

## RAC-TABLE-ROWID

`rowKey` falta o se repite en las filas cargadas.

Arreglo: Cada fila necesita un string estable y único. Selección, expansión y `scrollToRow` lo usan.

## RAC-TABLE-ID

`id` está vacío. La clave sería `${namespace}:table:`.

Arreglo: Pasa un id estable por tabla.

## RAC-COLUMN-COMPONENT

Si el `component` de una columna no está registrado en `config.columns` de `AutoConfigProvider`, el desarrollo avisa con `RAC-COLUMN-COMPONENT` y la celda conserva el formato predeterminado. Registra la clave o define `render`, `format` o `sort` en la columna. Las funciones de la columna tienen prioridad.

## RAC-ROW-ACTION

Si una acción de fila no tiene `onClick` y su `action` no es una clave conocida de `config.rowActions`, al seleccionarla la línea de estado muestra `RAC-ROW-ACTION`. Proporciona `onClick` o registra la clave de `action`. Si existen ambos, prevalece `onClick`.

## RAC-TABLE-SOURCE

`source` es una clave de `config.sources` en `AutoConfigProvider`. Una clave desconocida muestra `RAC-TABLE-SOURCE` con un botón para reintentar. Registra la clave o usa `data` / `dataSource`. Proporciona exactamente una de las tres opciones.

## RAC-TABLE-FILTER

El JSON del filtro no es una consulta. Se muestra el texto traducido y se conserva el filtro anterior.

Arreglo: Grupo: `{ kind: "group", operator, children }`. Condición: `{ kind: "condition", field, operator, value }`. `between` es `[from, to]`. `in` es un array.

## RAC-QUERY-FIELD

`serializeRsql` rechazó un nombre que no cumple `/^[\\w.]+$/`.

Arreglo: Solo letras, dígitos, guion bajo y puntos.

## RAC-DIALOG-PROVIDER

`useAutoDialog()` fuera de `AutoDialogProvider`.

Arreglo: Envuelve el árbol en `<AutoDialogProvider>`. `AutoConfigProvider` no da diálogos y es opcional. `<AutoDialog open>` no usa este hook.

## RAC-TABS-ROUTE-VALUE

No pase `route` y `value` a `AutoTabs` al mismo tiempo. Si se proporcionan ambos, `route` tiene prioridad y el modo de desarrollo muestra `RAC-TABS-ROUTE-VALUE`. Omita `value` cuando `AutoNavigation` controle la selección.
