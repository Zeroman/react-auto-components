# AutoSearch

[English](../../auto-search.md) | [简体中文](../zh-CN/auto-search.md) | **繁體中文** | [日本語](../ja/auto-search.md) | [한국어](../ko/auto-search.md) | [Español](../es/auto-search.md) | [Français](../fr/auto-search.md) | [Deutsch](../de/auto-search.md) | [Português (Brasil)](../pt-BR/auto-search.md) | [Русский](../ru/auto-search.md)

搜尋表單。內部渲染 `AutoForm`，同時給出 `QueryNode` 和原始值。欄位規則，包括拋錯後的行為，與 [AutoForm](auto-form.md) 相同。

`AutoSearchPanel` 與 `AutoSearchPanelProps` 是 `AutoSearch` 和 `AutoSearchProps` 的已棄用別名。

## 用法

```tsx
import { AutoSearch } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

<AutoSearch
  fields={[
    { name: "name", label: "名稱", match: "contains" },
    { name: "period", type: "daterange", label: "週期", match: "between" },
  ]}
  onSearch={(query, values) => load(query, values)}
/>
```

`type` 為 `daterange` 或 `match` 為 `"between"` 時，模型欄位必須是兩項元組。

## 行為與屬性

| 屬性 | 行為 |
| --- | --- |
| `fields` | 與 AutoForm 相同的 `Field<T>`。`more: true` 的欄位在展開「更多」之前隱藏。隱藏欄位不進入查詢。 |
| `onSearch(query, values)` | 必填。**throw 或 reject：內部表單捕獲它，值保留，顯示 `error.message`。不會因此重置。** |
| `onChange` | 編輯和重置都會觸發。即時搜尋時，它發生在 `onSearch` 之前。 |
| `mode` | 預設 `"instant"`：修改條件、提交或重設時搜尋。設為 `"manual"` 可僅在提交或重設時搜尋。 |
| `value`、`defaultValue` | 受控和重置規則與 AutoForm 相同。 |
| `columns` | 預設 `3`。 |
| `sortTags` | 你自己的按鈕。`onRemove` 不捕獲。 |
| 標籤屬性 | 與 AutoForm 相同。傳入的佈局優先於 provider。 |

## 查詢值

| `match` | 值 |
| --- | --- |
| 省略 | `"eq"`；值是陣列時為 `"in"`。 |
| `"contains"` | 子串。`ignoreCase: true` 忽略大小寫。 |
| `"between"` | `[from, to]`。標量會警告 `RAC-FIELD-BETWEEN`，並且匹配不到行。 |
| `"isNull"` | 匹配 null 或 undefined。輸入的值被忽略。 |
| 空值 | `undefined`、`null`、`""` 和空陣列會被省略，`"isNull"` 除外。 |

`includeNull: true` 會再 OR 一個 `isNull`。`searchFields` 把同一次比較 OR 到這些行欄位上，而不是只用 `name`。

重置會恢復 `defaultValue`，然後立刻搜尋。欄位名不符合 `/^[\w.]+$/` 時，`serializeRsql` 拋 `RAC-QUERY-FIELD`。

## 前置條件

入口引入一次 `style.css`（開發模式 `RAC-CSS-MISSING`）。`AutoConfigProvider` 可選，只提供佈局、翻譯和許可權。
