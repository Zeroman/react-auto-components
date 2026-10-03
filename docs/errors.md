# Error codes

**English** | [简体中文](i18n/zh-CN/errors.md) | [繁體中文](i18n/zh-TW/errors.md) | [日本語](i18n/ja/errors.md) | [한국어](i18n/ko/errors.md) | [Español](i18n/es/errors.md) | [Français](i18n/fr/errors.md) | [Deutsch](i18n/de/errors.md) | [Português (Brasil)](i18n/pt-BR/errors.md) | [Русский](i18n/ru/errors.md)

Developer failures throw `RacError` or call `console.warn` in development. The message is always:

```text
[Component] what is wrong.
Fix: what to change.
Code: RAC-…
Docs: https://github.com/Zeroman/react-auto-components/blob/main/docs/errors.md#rac-…
```

User-visible sentences stay on `config.t`. A `RacError` may carry `userKey`, the English source string the host translates. The console and the exception stay English.

## RAC-FIELD-OPTIONS

`type` is `select`, `select-v2`, `radio`, `checkbox`, or `cascader`, and `options` is missing or an empty array.

Fix: pass `options` as an array or as `(values) => Option[]`. `autocomplete` may omit options; it is a text box with optional suggestions.

## RAC-FIELD-RANGE

`type` is `daterange` or `datetimerange`, and the model field or the current value is not a two-item array.

Fix: type the field as `[start, end]` (`Pair`, or `[string, string]`, or `[number, number]` for timestamps). `dateValue` defaults to `"string"` (`YYYY-MM-DD`). `"timestamp"` stores epoch milliseconds. `null` is an open end.

A scalar string or number is a TypeScript error (`RAC-FIELD-RANGE` in the message). An array-typed model compiles; development mode warns when a real value does not have length 2.

## RAC-FIELD-BETWEEN

`match: "between"` is set and the model field or the current value is not `[from, to]`.

Fix: store a two-item tuple. A scalar does not match rows. The same rule is a TypeScript error on `Field<T>`.

## RAC-FIELD-CUSTOM

`type: "custom"` has neither `render` nor `component`.

Fix: pass `render(context)` or `component` set to a key in `AutoConfigProvider` `config.fields`.

## RAC-FIELD-DUPLICATE

Two fields share a `name`. Thrown from `defaults` while the form mounts.

Fix: unique names. `title`, `tip`, `append`, and `button` have no name and are skipped.

## RAC-CSS-MISSING

Development mode did not find `--auto-text` on `:root`. The stylesheet sets that variable. Without it the page looks unstyled and the DOM does not say why.

Fix: `import "@zeroman.yang/react-auto-components/style.css"` once in the app entry.

## RAC-TABLE-XLSX

`export("xlsx")` ran and `exportXlsx` was not passed.

Fix: `import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx"` and pass `exportXlsx={exportXlsx}`. The UI still shows the translated "Configure the XLSX export adapter".

## RAC-XLSX-DEP

The xlsx adapter could not load `exceljs`. It is an `optionalDependency`, so a normal install can skip it.

Fix: `pnpm add exceljs`. CSV and JSON do not need it.

## RAC-TABLE-EXPORT-PAGE

A remote export page was empty before the last page, so the file was not saved.

Fix: return a stable `total` and the rows for that `pageIndex`. The UI shows the translated "Export data is incomplete. Try again."

## RAC-TABLE-ROWID

`rowKey` was missing or repeated on a loaded row. Development warning.

Fix: every row needs a stable unique string. Selection, expansion, and `scrollToRow` use it.

## RAC-TABLE-ID

`AutoTable` `id` is empty, so settings would be stored at `${namespace}:table:`. Development warning.

Fix: pass a stable id per table.

## RAC-COLUMN-COMPONENT

A column `component` is not in `config.columns`. Development warning. The cell keeps the default format.

Fix: add that key to `AutoConfigProvider` `config.columns`, or set `render`, `format`, or `sort` on the column. A function on the column wins over the registry.

## RAC-ROW-ACTION

A row action has neither `onClick` nor a known `action` key. The status shows this message when the item is chosen.

Fix: pass `onClick`, or `action` set to a key in `config.rowActions`. `onClick` wins when both are set.

## RAC-TABLE-SOURCE

`AutoTable` `source` is not in `config.sources`. The table shows this message and a retry button.

Fix: add that key to `config.sources`, or pass `data` / `dataSource` instead. Pass only one of the three.

## RAC-TABLE-FILTER

The settings filter JSON is not a query. The translated "Invalid filter" stays on screen and the previous filter is kept.

Fix: a group is `{ kind: "group", operator: "and" | "or", children }`. A condition is `{ kind: "condition", field, operator, value }` where `field` is a column key. `between` value is `[from, to]`. `in` value is an array.

## RAC-QUERY-FIELD

`serializeRsql` refused a field name that is not `/^[\w.]+$/`.

Fix: letters, digits, underscore, and dots only. Rename the column or map it before serializing.

## RAC-DIALOG-PROVIDER

`useAutoDialog()` ran outside `AutoDialogProvider`.

Fix: wrap that tree in `<AutoDialogProvider>`. `AutoConfigProvider` does not provide dialogs and is optional. The declarative `<AutoDialog open>` does not use this hook.

## RAC-TABS-ROUTE-VALUE

Both `route` and `value` were supplied to `AutoTabs`.

Fix: omit `value` when using `route`-driven navigation; `AutoNavigation` owns the active tab selection.
