# AutoTabs

[English](../../auto-tabs.md) | [简体中文](../zh-CN/auto-tabs.md) | [繁體中文](../zh-TW/auto-tabs.md) | [日本語](../ja/auto-tabs.md) | [한국어](../ko/auto-tabs.md) | **Español** | [Français](../fr/auto-tabs.md) | [Deutsch](../de/auto-tabs.md) | [Português (Brasil)](../pt-BR/auto-tabs.md) | [Русский](../ru/auto-tabs.md)

Pestañas. Las anidadas son otro `AutoTabs` alimentado por `children`. Para una barra lateral usa [AutoMenu](auto-menu.md).

## Comportamiento y props

| Prop | Comportamiento |
| --- | --- |
| `items` | Cada pestaña necesita un `id` estable. `hidden` y un `canAccess` fallido la quitan. |
| `value` | Ruta controlada de ids desde la raíz. Lo anidado es `["parent", "child"]`. |
| `onChange(path, item)` | **No se captura.** Si lanza, React informa el error. En modo controlado, la ruta no confirmada se queda en la anterior. |
| `mode` | Por defecto `"horizontal"`. `"vertical"` apila la lista. |
| `keepMounted` | Por defecto `true`: los paneles inactivos siguen montados. `false` los desmonta. |
| `onRefresh` | Si existe, hay un botón de refresco. **No se captura.** |
| `disabled` | Sigue visible y no se puede elegir. La selección por defecto salta las pestañas deshabilitadas. |

No pase `route` y `value` a `AutoTabs` al mismo tiempo. Si se proporcionan ambos, `route` tiene prioridad y el modo de desarrollo muestra `RAC-TABS-ROUTE-VALUE`. Omita `value` cuando `AutoNavigation` controle la selección.

## Precondiciones

Importa `style.css` una vez (`RAC-CSS-MISSING` en desarrollo). `AutoConfigProvider` es opcional.

## Pestañas dinámicas

`useAutoTabsWorkspace` abre y cierra páginas sin un router. Pasa `tabsProps` a `AutoTabs`. Volver a llamar `open` con el mismo id solo selecciona esa pestaña y conserva el borrador. Una pestaña fijada no se cierra. Espera a `ready` antes de `open`. La selección, `params` y `state` se restauran desde `sessionStorage` tras el montaje. Si `beforeClose` devuelve `false` o lanza, no se cierra. El ejemplo está en [DynamicTabsDemo.tsx](../../../test-project/src/examples/DynamicTabsDemo.tsx).
