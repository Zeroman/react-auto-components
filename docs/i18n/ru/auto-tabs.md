# AutoTabs

[English](../../auto-tabs.md) | [简体中文](../zh-CN/auto-tabs.md) | [繁體中文](../zh-TW/auto-tabs.md) | [日本語](../ja/auto-tabs.md) | [한국어](../ko/auto-tabs.md) | [Español](../es/auto-tabs.md) | [Français](../fr/auto-tabs.md) | [Deutsch](../de/auto-tabs.md) | [Português (Brasil)](../pt-BR/auto-tabs.md) | **Русский**

Вкладки. Вложенные — это еще один `AutoTabs` из `children`. Для боковой панели используйте [AutoMenu](auto-menu.md).

## Поведение и свойства

| Свойство | Поведение |
| --- | --- |
| `items` | У каждой вкладки стабильный `id`. `hidden` и неудачный `canAccess` убирают вкладку. |
| `value` | Управляемый путь id от корня. Вложенный путь — `["parent", "child"]`. |
| `onChange(path, item)` | **Не перехватывается.** Если бросает, React сообщает об ошибке. В управляемом режиме еще не зафиксированный путь остается прежним. |
| `mode` | По умолчанию `"horizontal"`. `"vertical"` ставит список вертикально. |
| `keepMounted` | По умолчанию `true`: неактивные панели остаются смонтированными. `false` размонтирует их. |
| `onRefresh` | Если задан, у вкладки есть кнопка обновления. **Не перехватывается.** |
| `disabled` | Остается видимой и не выбирается. Выбор по умолчанию пропускает отключенные вкладки. |

Не передавайте `route` и `value` в `AutoTabs` одновременно. Если указаны оба свойства, приоритет имеет `route`, а в режиме разработки появляется предупреждение `RAC-TABS-ROUTE-VALUE`. Уберите `value`, когда выбором управляет `AutoNavigation`.

## Предусловия

Импортируйте `style.css` один раз (`RAC-CSS-MISSING` в разработке). `AutoConfigProvider` необязателен.

## Динамические вкладки

`useAutoTabsWorkspace` открывает и закрывает страницы без роутера. Передайте `tabsProps` в `AutoTabs`. Повторный `open` с тем же id только выбирает вкладку и сохраняет черновик. Закреплённую вкладку закрыть нельзя. Дождитесь `ready`, прежде чем вызывать `open`. Выбор, `params` и `state` восстанавливаются из `sessionStorage` после монтирования. Если `beforeClose` вернёт `false` или бросит ошибку, закрытие отменяется. Пример: [DynamicTabsDemo.tsx](../../../test-project/src/examples/DynamicTabsDemo.tsx).
