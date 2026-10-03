# Коды ошибок

[English](../../errors.md) | [简体中文](../zh-CN/errors.md) | [繁體中文](../zh-TW/errors.md) | [日本語](../ja/errors.md) | [한국어](../ko/errors.md) | [Español](../es/errors.md) | [Français](../fr/errors.md) | [Deutsch](../de/errors.md) | [Português (Brasil)](../pt-BR/errors.md) | **Русский**

Сбои для разработчика бросают `RacError` или вызывают `console.warn` в режиме разработки. Текст всегда на английском.

```text
[Component] what is wrong.
Fix: what to change.
Code: RAC-…
Docs: https://github.com/Zeroman/react-auto-components/blob/main/docs/errors.md#rac-…
```

Текст интерфейса остается в `config.t`. `userKey` — исходная английская фраза, которую хост переводит. Консоль и исключение остаются на английском.

## RAC-FIELD-OPTIONS

`type` равен `select`, `select-v2`, `radio`, `checkbox` или `cascader`, а `options` нет или массив пуст.

Исправление: Передайте `options` массивом или `(values) => Option[]`. `autocomplete` может обойтись без них.

## RAC-FIELD-RANGE

`daterange` или `datetimerange` не имеет значения из двух элементов.

Исправление: Типизируйте поле как `[start, end]`. `dateValue` по умолчанию `"string"`. `"timestamp"` хранит локальные миллисекунды. `null` оставляет конец открытым. Скаляр — ошибка TypeScript. Массив в модели компилируется; в разработке будет предупреждение, если реальная длина не 2.

## RAC-FIELD-BETWEEN

`match: "between"` — это не `[from, to]`.

Исправление: Храните пару. Скаляр не совпадает ни с одной строкой. На `Field<T>` это тоже ошибка типа.

## RAC-FIELD-CUSTOM

`type: "custom"` без `render` и без `component`.

Исправление: Передайте `render(context)` или ключ `component` из `config.fields`.

## RAC-FIELD-DUPLICATE

Два поля с одним `name`. `defaults` бросает это при монтировании.

Исправление: Имена уникальны. У `title`, `tip`, `append` и `button` имени нет.

## RAC-CSS-MISSING

В разработке на `:root` нет `--auto-text`. Без таблицы стилей страница разъезжается, и DOM не объясняет почему.

Исправление: Один раз: `import "@zeroman.yang/react-auto-components/style.css"`.

## RAC-TABLE-XLSX

`export("xlsx")` без `exportXlsx`.

Исправление: Импортируйте `{ exportXlsx }` из `@zeroman.yang/react-auto-components/xlsx`. Интерфейс покажет переведенную фразу.

## RAC-XLSX-DEP

`exceljs` не загрузился. Это `optionalDependency`.

Исправление: `pnpm add exceljs`. CSV и JSON его не требуют.

## RAC-TABLE-EXPORT-PAGE

Удаленная страница пуста до последней. Частичный файл не сохраняется.

Исправление: Верните стабильный `total` и строки этого `pageIndex`.

## RAC-TABLE-ROWID

`rowKey` отсутствует или повторяется в загруженных строках.

Исправление: У каждой строки должна быть стабильная уникальная строка.

## RAC-TABLE-ID

`id` пуст. Ключ был бы `${namespace}:table:`.

Исправление: Передайте стабильный id каждой таблице.

## RAC-COLUMN-COMPONENT

Если `component` столбца не зарегистрирован в `config.columns` у `AutoConfigProvider`, в режиме разработки появляется предупреждение `RAC-COLUMN-COMPONENT`, а ячейка использует стандартный формат. Зарегистрируйте ключ или задайте `render`, `format` либо `sort` в столбце. Функции столбца имеют приоритет.

## RAC-ROW-ACTION

Если у действия строки нет `onClick`, а `action` не является известным ключом `config.rowActions`, при выборе действия в строке состояния появляется `RAC-ROW-ACTION`. Передайте `onClick` или зарегистрируйте ключ `action`. Если указаны оба, приоритет у `onClick`.

## RAC-TABLE-SOURCE

`source` — ключ в `config.sources` у `AutoConfigProvider`. Неизвестный ключ вызывает `RAC-TABLE-SOURCE` с кнопкой повтора. Зарегистрируйте ключ или используйте `data` / `dataSource`. Укажите ровно один из трёх вариантов.

## RAC-TABLE-FILTER

JSON фильтра — не запрос. Показывается перевод, прежний фильтр остается.

Исправление: Группа `{ kind: "group", operator, children }`. Условие `{ kind: "condition", field, operator, value }`. `between` — это `[from, to]`.

## RAC-QUERY-FIELD

`serializeRsql` отклонил имя вне `/^[\\w.]+$/`.

Исправление: Только буквы, цифры, подчеркивание и точки.

## RAC-DIALOG-PROVIDER

`useAutoDialog()` вне `AutoDialogProvider`.

Исправление: Оберните дерево в `<AutoDialogProvider>`. `AutoConfigProvider` диалогов не дает и необязателен. `<AutoDialog open>` этот хук не использует.

## RAC-TABS-ROUTE-VALUE

Не передавайте `route` и `value` в `AutoTabs` одновременно. Если указаны оба свойства, приоритет имеет `route`, а в режиме разработки появляется предупреждение `RAC-TABS-ROUTE-VALUE`. Уберите `value`, когда выбором управляет `AutoNavigation`.
