# AutoMenu

[English](../../auto-menu.md) | [简体中文](../zh-CN/auto-menu.md) | [繁體中文](../zh-TW/auto-menu.md) | [日本語](../ja/auto-menu.md) | [한국어](../ko/auto-menu.md) | [Español](../es/auto-menu.md) | [Français](../fr/auto-menu.md) | [Deutsch](../de/auto-menu.md) | [Português (Brasil)](../pt-BR/auto-menu.md) | **Русский**

Боковая панель. Для панелей с содержимым используйте [AutoTabs](auto-tabs.md).

## Поведение и свойства

| Свойство | Поведение |
| --- | --- |
| `items` | `id` уникален в дереве. `hidden` и неудачный `canAccess` отбрасывают пункт. `children`, который указывает на предка, отбрасывается целиком, чтобы плохая схема не ушла в рекурсию. |
| `value` | Id выбранного листа. Если опустить, выбор хранится внутри. |
| `onChange(id, item, path)` | **Не перехватывается.** `path` — цепочка id от корня до листа. Родитель с детьми только переключает раскрытие и не выбирается. |
| `collapsible` | По умолчанию `false`. Если `collapsed` управляемый, обновите его в `onCollapsedChange`, иначе рельс не сдвинется. **`onCollapsedChange` не перехватывается.** |
| `disabled` | Отключает пункт и потомков. Выбор их пропускает. |

Выбор листа сам по себе не переходит по маршруту. Единственный сигнал — `onChange`.

## Предусловия

Импортируйте `style.css` один раз. `AutoConfigProvider` необязателен. Права идут через `config.canAccess`.

Один раз импортируйте в точке входа приложения `import "@zeroman.yang/react-auto-components/style.css"`. Без таблицы стилей в режиме разработки появляется предупреждение `RAC-CSS-MISSING`.
