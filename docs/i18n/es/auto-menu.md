# AutoMenu

[English](../../auto-menu.md) | [简体中文](../zh-CN/auto-menu.md) | [繁體中文](../zh-TW/auto-menu.md) | [日本語](../ja/auto-menu.md) | [한국어](../ko/auto-menu.md) | **Español** | [Français](../fr/auto-menu.md) | [Deutsch](../de/auto-menu.md) | [Português (Brasil)](../pt-BR/auto-menu.md) | [Русский](../ru/auto-menu.md)

Barra lateral. Para paneles usa [AutoTabs](auto-tabs.md).

## Comportamiento y props

| Prop | Comportamiento |
| --- | --- |
| `items` | `id` único en el árbol. `hidden` y un `canAccess` fallido descartan la entrada. Un `children` que apunta a un ancestro se descarta entero para que un esquema malo no recurse. |
| `value` | Id de la hoja seleccionada. Si se omite, la selección queda dentro. |
| `onChange(id, item, path)` | **No se captura.** `path` es la cadena de ids desde la raíz. Un padre con hijos alterna la expansión y no se selecciona. |
| `collapsible` | Por defecto `false`. Si `collapsed` está controlado, hay que actualizarlo en `onCollapsedChange` o el rail no se mueve. **`onCollapsedChange` no se captura.** |
| `disabled` | Deshabilita la entrada y sus descendientes. La selección los salta. |

Elegir una hoja no navega por sí solo. La única señal es `onChange`.

## Precondiciones

Importa `style.css` una vez. `AutoConfigProvider` es opcional. Los permisos usan `config.canAccess`.

Importa una vez en la entrada de la aplicación `import "@zeroman.yang/react-auto-components/style.css"`. Si falta la hoja de estilos, el desarrollo avisa con `RAC-CSS-MISSING`.
