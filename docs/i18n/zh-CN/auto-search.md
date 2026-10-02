# AutoSearch

[English](../../auto-search.md) | **简体中文** | [繁體中文](../zh-TW/auto-search.md) | [日本語](../ja/auto-search.md) | [한국어](../ko/auto-search.md) | [Español](../es/auto-search.md) | [Français](../fr/auto-search.md) | [Deutsch](../de/auto-search.md) | [Português (Brasil)](../pt-BR/auto-search.md) | [Русский](../ru/auto-search.md)

搜索表单。内部渲染 `AutoForm`，同时给出 `QueryNode` 和原始值。字段规则，包括抛错后的行为，与 [AutoForm](auto-form.md) 相同。

`AutoSearchPanel` 和 `AutoSearchPanelProps` 是 `AutoSearch` 与 `AutoSearchProps` 的已弃用别名。

## 用法

```tsx
import { AutoSearch } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

<AutoSearch
  fields={[
    { name: "name", label: "名称", match: "contains" },
    { name: "period", type: "daterange", label: "周期", match: "between" },
  ]}
  onSearch={(query, values) => load(query, values)}
/>
```

`type` 为 `daterange` 或 `match` 为 `"between"` 时，模型字段必须是两项元组。

## 行为与属性

| 属性 | 行为 |
| --- | --- |
| `fields` | 与 AutoForm 相同的 `Field<T>`。`more: true` 的字段在展开「更多」之前隐藏。隐藏字段不进入查询。 |
| `onSearch(query, values)` | 必填。**throw 或 reject：内部表单捕获它，值保留，显示 `error.message`。不会因此重置。** |
| `onChange` | 编辑和重置都会触发。即时搜索时，它发生在 `onSearch` 之前。 |
| `mode` | 默认 `"manual"`：点搜索才查。`"instant"` 每次修改也查。 |
| `value`、`defaultValue` | 受控和重置规则与 AutoForm 相同。 |
| `columns` | 默认 `3`。 |
| `sortTags` | 你自己的按钮。`onRemove` 不捕获。 |
| 标签属性 | 与 AutoForm 相同。传入的布局优先于 provider。 |

## 查询值

| `match` | 值 |
| --- | --- |
| 省略 | `"eq"`；值是数组时为 `"in"`。 |
| `"contains"` | 子串。`ignoreCase: true` 忽略大小写。 |
| `"between"` | `[from, to]`。标量会警告 `RAC-FIELD-BETWEEN`，并且匹配不到行。 |
| `"isNull"` | 匹配 null 或 undefined。输入的值被忽略。 |
| 空值 | `undefined`、`null`、`""` 和空数组会被省略，`"isNull"` 除外。 |

`includeNull: true` 会再 OR 一个 `isNull`。`searchFields` 把同一次比较 OR 到这些行字段上，而不是只用 `name`。

重置会恢复 `defaultValue`，然后立刻搜索。字段名不符合 `/^[\w.]+$/` 时，`serializeRsql` 抛 `RAC-QUERY-FIELD`。

## 前置条件

入口引入一次 `style.css`（开发模式 `RAC-CSS-MISSING`）。`AutoConfigProvider` 可选，只提供布局、翻译和权限。
