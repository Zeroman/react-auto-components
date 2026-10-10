# 错误码

[English](../../errors.md) | **简体中文** | [繁體中文](../zh-TW/errors.md) | [日本語](../ja/errors.md) | [한국어](../ko/errors.md) | [Español](../es/errors.md) | [Français](../fr/errors.md) | [Deutsch](../de/errors.md) | [Português (Brasil)](../pt-BR/errors.md) | [Русский](../ru/errors.md)

开发者错误抛出 `RacError`，或在开发模式 `console.warn`。正文始终是英文：

```text
[Component] 哪里错了。
Fix: 怎么改。
Code: RAC-…
Docs: https://github.com/Zeroman/react-auto-components/blob/main/docs/errors.md#rac-…
```

界面文案仍走 `config.t`。`RacError.userKey` 是英文源句，宿主照旧翻译。控制台和异常本身保持英文，方便模型按报错修改。

## RAC-FOCUS-TARGET

AutoFocus 的 `target` 不是有效的 CSS 选择器。在注册或更新选项时抛出错误，不会等到异步焦点解析时才报错。

修复：为 AutoFocus 的 `target` 传入有效的 CSS 选择器或 DOM ref。

## RAC-FIELD-OPTIONS

`type` 为 `select`、`select-v2`、`radio`、`checkbox` 或 `cascader`，但没有 `options`，或 `options` 是空数组。

修复：传入 `options` 数组，或 `(values) => Option[]`。`autocomplete` 可以不传，它是带可选建议的文本框。

## RAC-FIELD-RANGE

`type` 为 `daterange` 或 `datetimerange`，但模型字段或当前值不是两项数组。

修复：把字段类型写成 `[start, end]`。`dateValue` 默认 `"string"`（`YYYY-MM-DD`）。`"timestamp"` 存本地时区的毫秒时间戳。`null` 表示该端不限制。

标量字符串或数字在 TypeScript 里直接报错，错误文本含 `RAC-FIELD-RANGE`。模型若是数组类型则能通过编译；运行值长度不是 2 时，开发模式会警告。

## RAC-FIELD-BETWEEN

`match: "between"` 的模型字段或当前值不是 `[from, to]`。

修复：存成两项元组。标量不会命中任何行。`Field<T>` 上这同样是类型错误。

## RAC-FIELD-CUSTOM

`type: "custom"` 既没有 `render` 也没有 `component`。

修复：传入 `render(context)`，或把 `component` 设为 `AutoConfigProvider` 的 `config.fields` 里的键。

## RAC-FIELD-DUPLICATE

两个字段 `name` 相同。表单挂载时 `defaults` 抛出。

修复：名字唯一。`title`、`tip`、`append`、`button` 没有名字，不参与检查。

## RAC-CSS-MISSING

开发模式在 `:root` 上读不到 `--auto-text`。样式表会设置这个变量。没引入样式时页面是乱的，DOM 里看不出原因。

修复：在应用入口写一次 `import "@zeroman.yang/react-auto-components/style.css"`。

## RAC-TABLE-XLSX

调用了 `export("xlsx")`，但没有传 `exportXlsx`。

修复：`import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx"`，并传入 `exportXlsx={exportXlsx}`。界面仍显示翻译后的 "Configure the XLSX export adapter"。

## RAC-XLSX-DEP

xlsx 适配器加载不到 `exceljs`。它是 `optionalDependency`，普通安装可能把它跳过。

修复：`pnpm add exceljs`。CSV 和 JSON 不需要它。

## RAC-TABLE-EXPORT-PAGE

远程导出时，最后一页之前出现了空页，因此没有保存文件。

修复：`total` 要稳定，并且每一页都返回该 `pageIndex` 的行。界面显示翻译后的 "Export data is incomplete. Try again."。

## RAC-TABLE-ROWID

已加载的行里 `rowKey` 缺失或重复。仅开发警告。

修复：每行要有稳定且唯一的字符串。选择、展开和 `scrollToRow` 都用它。

## RAC-TABLE-ID

`AutoTable` 的 `id` 是空的，设置会写到 `${namespace}:table:`。仅开发警告。

修复：每张表传一个稳定的 id。

## RAC-COLUMN-COMPONENT

列的 `component` 未在 `AutoConfigProvider` 的 `config.columns` 中注册时，开发模式警告 `RAC-COLUMN-COMPONENT`，单元格使用默认格式。注册该键，或在列上提供 `render`、`format`、`sort`；列上的函数优先。

## RAC-ROW-ACTION

行菜单动作缺少 `onClick`，且 `action` 不是已注册的 `config.rowActions` 键时，选择该动作会在状态行显示 `RAC-ROW-ACTION`。提供 `onClick` 或注册对应的 `action`；两者都有时 `onClick` 优先。

## RAC-TABLE-SOURCE

`source` 是 `AutoConfigProvider` 的 `config.sources` 中的数据源键。未知键会显示 `RAC-TABLE-SOURCE` 和重试按钮。注册该键，或改用 `data` / `dataSource`；三者只能提供一个。

## RAC-TABLE-FILTER

设置里的筛选 JSON 不是合法查询。界面仍显示翻译后的 "Invalid filter"，并保留上一次的筛选。

修复：分组是 `{ kind: "group", operator: "and" | "or", children }`。条件是 `{ kind: "condition", field, operator, value }`，`field` 必须是列键。`between` 的值是 `[from, to]`。`in` 的值是数组。

## RAC-QUERY-FIELD

`serializeRsql` 拒绝了不符合 `/^[\w.]+$/` 的字段名。

修复：只用字母、数字、下划线和点。先重命名或映射列，再序列化。

## RAC-DIALOG-PROVIDER

在 `AutoDialogProvider` 之外调用了 `useAutoDialog()`。

修复：在该树外包一层 `<AutoDialogProvider>`。`AutoConfigProvider` 不提供弹窗，而且是可选的。声明式 `<AutoDialog open>` 不用这个 hook。

## RAC-TABS-ROUTE-VALUE

同时向 `AutoTabs` 传入了 `route` 和 `value`。

修复：在使用 `route` 驱动的导航模式下省略 `value`；由 `AutoNavigation` 全权接管当前选中的标签页。

## RAC-TABS-SOURCE

`source` 不是 `AutoConfigProvider` 的 `config.tabsSources` 中的标签页数据源键。未知键会显示 `RAC-TABS-SOURCE` 和重试按钮。

修复：注册该键，或改用本地 `items` 或函数；`items` 和 `source` 只能提供一个。
