# AutoSearch

[English](../../auto-search.md) | [简体中文](../zh-CN/auto-search.md) | [繁體中文](../zh-TW/auto-search.md) | [日本語](../ja/auto-search.md) | [한국어](../ko/auto-search.md) | [Español](../es/auto-search.md) | [Français](../fr/auto-search.md) | [Deutsch](../de/auto-search.md) | [Português (Brasil)](../pt-BR/auto-search.md) | **Русский**

Форма поиска. Рисует `AutoForm` и отдает `QueryNode` вместе со значениями. Если колбэк поля бросает, действуют правила [AutoForm](auto-form.md).

`AutoSearchPanel` и `AutoSearchPanelProps` — устаревшие псевдонимы `AutoSearch` и `AutoSearchProps`.

## Поведение и свойства

| Свойство | Поведение |
| --- | --- |
| `onSearch(query, values)` | Обязателен. **Throw или reject: внутренняя форма перехватывает, значения остаются, показывается `error.message`. Сброса нет.** |
| `mode` | По умолчанию `"instant"`: поиск при изменении, отправке и сбросе. `"manual"` — только при отправке или сбросе. |
| `columns` | По умолчанию `3`. |
| `more: true` | Прячет поле, пока не открыто «Еще». Скрытые поля не попадают в запрос. |

| `match` | Значение |
| --- | --- |
| не задан | `"eq"`, или `"in"`, если значение — массив. |
| `"contains"` | Подстрока. `ignoreCase: true` не различает регистр. |
| `"between"` | `[from, to]`. Скаляр предупреждает `RAC-FIELD-BETWEEN` и не совпадает со строками. |
| `"isNull"` | Совпадает с null или undefined. Введенное значение игнорируется. |
| пусто | `undefined`, `null`, `""` и пустые массивы опускаются, кроме `"isNull"`. |

Сброс возвращает `defaultValue` и затем ищет. `serializeRsql` бросает `RAC-QUERY-FIELD`, если имя не подходит под `/^[\w.]+$/`.

## Предусловия

Импортируйте `style.css` один раз. `AutoConfigProvider` необязателен.

Один раз импортируйте в точке входа приложения `import "@zeroman.yang/react-auto-components/style.css"`. Без таблицы стилей в режиме разработки появляется предупреждение `RAC-CSS-MISSING`.
