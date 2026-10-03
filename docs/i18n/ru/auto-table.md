# AutoTable

[English](../../auto-table.md) | [简体中文](../zh-CN/auto-table.md) | [繁體中文](../zh-TW/auto-table.md) | [日本語](../ja/auto-table.md) | [한국어](../ko/auto-table.md) | [Español](../es/auto-table.md) | [Français](../fr/auto-table.md) | [Deutsch](../de/auto-table.md) | [Português (Brasil)](../pt-BR/auto-table.md) | **Русский**

Локальная или удаленная таблица. Передайте ровно один из `data`, `dataSource` или `source`; несколько одновременно — ошибка типа. Поиск следует [AutoSearch](auto-search.md). Добавление и правка следуют [AutoDialog](auto-dialog.md) и [AutoForm](auto-form.md).

`exportXlsx` импортируется из `@zeroman.yang/react-auto-components/xlsx`. `exceljs` необязателен (`RAC-XLSX-DEP`, если его нет).

## Поведение и свойства

| Свойство | Поведение |
| --- | --- |
| `id` | Обязателен. Ключ — `${namespace}:table:${id}`. Пустой id предупреждает `RAC-TABLE-ID`. |
| `rowKey` | Уникален среди загруженных строк. Отсутствие или повтор: `RAC-TABLE-ROWID`. Выбор, раскрытие и `scrollToRow` используют его. |
| `dataSource` | **Reject: сообщение и кнопка повтора. Abort игнорируется.** `total` — полное число после фильтра, не длина страницы. |
| `pageSize` | По умолчанию `10`. `pagination` по умолчанию `true`. `height` по умолчанию `440`. `"auto"` заполняет родителя, у которого уже есть высота. |
| `onAdd`, `onEdit`, `onDelete` | **Reject или throw: диалог остается открытым и показывает `error.message`.** Строки не меняются, если обработчик сам их еще не изменил. |
| `rowActions` | Отклонение `onClick` перехватывается и показывается в строке состояния примерно 2,5 секунды. Строка остаётся. Если у действия строки нет `onClick`, а `action` не является известным ключом `config.rowActions`, при выборе действия в строке состояния появляется `RAC-ROW-ACTION`. Передайте `onClick` или зарегистрируйте ключ `action`. Если указаны оба, приоритет у `onClick`. |
| `component` | Если `component` столбца не зарегистрирован в `config.columns` у `AutoConfigProvider`, в режиме разработки появляется предупреждение `RAC-COLUMN-COMPONENT`, а ячейка использует стандартный формат. Зарегистрируйте ключ или задайте `render`, `format` либо `sort` в столбце. Функции столбца имеют приоритет. |
| `source` | `source` — ключ в `config.sources` у `AutoConfigProvider`. Неизвестный ключ вызывает `RAC-TABLE-SOURCE` с кнопкой повтора. Зарегистрируйте ключ или используйте `data` / `dataSource`. Укажите ровно один из трёх вариантов. |
| `exportXlsx` | Нужен только для xlsx. Если его нет, `RAC-TABLE-XLSX`. CSV и JSON встроены. |
| `toolbarActions` | Обновить, настройки, экспорт и JSON. По умолчанию видны все четыре. `false` скрывает их. Объект скрывает только кнопки со значением `false`. `handle.refresh()` и `handle.export()` остаются доступны. Подпись JSON — переведённая строка `"JSON"`. |

`handle.export` резолвится, даже если в статусе ошибка; повторно не бросает. Удаленный `"filtered"` обходит все страницы. Пустая страница до последней бросает `RAC-TABLE-EXPORT-PAGE` и не скачивает частичный файл.

Неверный JSON фильтра показывает перевод, предупреждает `RAC-TABLE-FILTER` и сохраняет прежний фильтр. `between` имеет длину 2. `in` — массив.

`handle.reset()` очищает сортировку, фильтр и выбор и возвращает раскладку к колонкам. `scrollToRow` ничего не делает, если этот id не загружен.

## Предусловия

Импортируйте `style.css` один раз. Разделяйте `namespace`, если несколько приложений на одном origin хранят таблицы; по умолчанию `"auto"`. Встроенным диалогам добавления и правки `AutoDialogProvider` не нужен. Он нужен только `useAutoDialog()`.
