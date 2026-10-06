# Registro de cambios

[English](../../CHANGELOG.md) | [简体中文](../zh-CN/CHANGELOG.md) | [繁體中文](../zh-TW/CHANGELOG.md) | [日本語](../ja/CHANGELOG.md) | [한국어](../ko/CHANGELOG.md) | **Español** | [Français](../fr/CHANGELOG.md) | [Deutsch](../de/CHANGELOG.md) | [Português (Brasil)](../pt-BR/CHANGELOG.md) | [Русский](../ru/CHANGELOG.md)

## Unreleased

- This locale is paused. See docs/CHANGELOG.md (English) for the unreleased notes.

## 0.3.0 - 2026-10-06

- This locale is paused. See docs/CHANGELOG.md (English) for the unreleased notes.

## 0.2.0 - 2026-10-04

- This locale is paused. See docs/CHANGELOG.md (English) for the 0.2.0 notes.

## 0.1.4 - 2026-10-03

- Se añade `AutoNavigation`. Los componentes montados se registran en un árbol de rutas. `goto` admite rutas relativas, comprobaciones de acceso y una señal de cancelación. Solo las ubicaciones confirmadas se sincronizan con el historial hash, del navegador o en memoria. `AutoMenu` y `AutoTabs` aceptan `route` y siguen al hijo activo.
- Se añaden `AutoTip` y `DefaultTip`. Las ayudas de campos, columnas, menús y pestañas flotan. Los tipos de presentación `tip` y `append` siguen en línea. Gana el componente del elemento, luego el del componente propietario, después `config.form`, `config.table`, `config.tabs` o `config.menu`, y al final `config.tipComponent`.
- `mode` de `AutoSearch` pasa a ser `"instant"` por defecto. Los campos ocultos y los que no superan `canAccess` permanecen en los valores y se omiten de la consulta. Las opciones de búsqueda van en `search`; las props `match` de nivel superior siguen funcionando.
- `toolbarActions` de `AutoTable` muestra u oculta Actualizar, Ajustes, Exportar y JSON. `handle.refresh()` y `handle.export()` siguen disponibles. Las etiquetas de orden aparecen cuando hay dos o más columnas ordenadas.
- Los formularios aceptan ranuras `classNames` y `styles`, un elemento `divider` y `virtual-select`.

## 0.1.3 - 2026-10-02

- El texto de interfaz integrado pasa a inglés por defecto, y esa cadena es la clave de `config.t`. Pasa `t` para otros idiomas. Las claves chinas anteriores, como `提交` y `刷新`, ya no son el valor por defecto.
- El formulario de búsqueda es `AutoSearch` (`AutoSearchProps`). `AutoSearchPanel` y `AutoSearchPanelProps` siguen como alias en desuso.
- `Field<T>` es una unión discriminada. Un `select` sin `options`, un escalar en `daterange` o `datetimerange`, y `match: "between"` en un escalar son errores de TypeScript. `AnyField` y `unsafeField()` siguen siendo la salida.
- Los errores de desarrollo son `RacError` en inglés, con componente, corrección y código. Véase [errors.md](errors.md). El modo de desarrollo avisa de una hoja de estilos ausente, un id de tabla vacío, `rowKey` duplicados, campos de elección sin options y valores de intervalo que no son un par.
- `AutoConfigProvider` acepta registros JSON: `config.fields`, `config.columns`, `config.rowActions` y `config.sources`. Una clave resuelve `Field.component`, `render` / `format` / `sort` / `exportFormat` de la columna, `RowAction.action` y `source` de `AutoTable`. Gana la función puesta en el campo, la columna o la acción. Los providers anidados se fusionan y gana la clave posterior. Pasa solo uno de `data`, `dataSource` o `source`. Un source desconocido muestra `RAC-TABLE-SOURCE` y reintento.
- Se añaden `data-testid="rac-*"` estables para campos, tablas, búsqueda, formularios y diálogos. No siguen la etiqueta traducida.
- `useAutoTabsWorkspace` abre, cambia y cierra pestañas dinámicas, con pestañas fijadas y almacenamiento de sesión opcional. Una pestaña puede ser `closable`, `lazy`, `disabled` o `loading`.
- Contratos: [AutoForm](auto-form.md), [AutoSearch](auto-search.md), [AutoTable](auto-table.md), [AutoDialog](auto-dialog.md), [AutoTabs](auto-tabs.md), [AutoMenu](auto-menu.md). `llms.txt` en la raíz del paquete es la entrada para agentes.
- Una etiqueta `v*` publica en npm mediante trusted publishing de GitHub Actions. `./run.sh release` sube el parche en un `main` limpio.

## 0.1.2 - 2026-10-01

- Publicación como `@zeroman.yang/react-auto-components`. El scope `@zeroman` de npm pertenece a otra cuenta.

- Se añade AutoChat con renderizado de mensajes controlado por el llamador, seguimiento de streaming, anclaje de historial, compositor opcional y demo en diez idiomas; sin nuevas dependencias en tiempo de ejecución.
- La demo en línea ahora muestra el código fuente real de cada ejemplo en un diálogo «Ver código», con pestañas de archivo, copia en un clic y enlaces a GitHub.
- Componentes de React 19 basados en esquemas: AutoForm, AutoSearchPanel, AutoTable, AutoDialog, AutoTabs y AutoMenu.
- Tamaño y densidad globales, diseños de etiquetas de formularios, ajustes de tabla persistentes y exportación XLSX opcional.
- Un proyecto consumidor que utiliza un archivo tarball real, pruebas unitarias, comprobaciones de tipos y pruebas de interacción de Chromium.
- Licencia MIT, guía de contribución, integración continua de GitHub, plantillas de incidencias e instrucciones para configurar la cuenta de npm y publicar.
- Documentación en inglés de forma predeterminada, con traducciones completas y enlaces para cambiar de idioma.
