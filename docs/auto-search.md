# AutoSearch

**English** | [简体中文](i18n/zh-CN/auto-search.md) | [繁體中文](i18n/zh-TW/auto-search.md) | [日本語](i18n/ja/auto-search.md) | [한국어](i18n/ko/auto-search.md) | [Español](i18n/es/auto-search.md) | [Français](i18n/fr/auto-search.md) | [Deutsch](i18n/de/auto-search.md) | [Português (Brasil)](i18n/pt-BR/auto-search.md) | [Русский](i18n/ru/auto-search.md)

Search form. It renders an `AutoForm` and emits both a `QueryNode` and the raw values. Field rules, including throw behavior, are the [AutoForm](auto-form.md) rules.

`AutoSearchPanel` and `AutoSearchPanelProps` are deprecated aliases of `AutoSearch` and `AutoSearchProps`.

## Usage

```tsx
import { AutoSearch } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

<AutoSearch
  fields={[
    { name: "name", label: "Name", match: "contains" },
    {
      name: "period",
      type: "daterange",
      label: "Period",
      match: "between",
    },
  ]}
  onSearch={(query, values) => load(query, values)}
/>
```

`period` on the model must be a two-item tuple when `type` is `daterange` or `match` is `"between"`.

## Behavior and props

| Prop | Behavior |
| --- | --- |
| `fields` | Same `Field<T>` contract as AutoForm. `more: true` hides the field until "More" is expanded. Hidden fields are left out of the query. |
| `onSearch(query, values)` | Required. **Throw or reject: the inner form catches it, values stay, `error.message` is shown. Reset does not run.** |
| `onChange` | Fires for edits and for reset, before `onSearch` on an instant search. |
| `mode` | Default `"manual"`: search on the search button. `"instant"` also searches on every change. |
| `value`, `defaultValue` | Same controlled and reset rules as AutoForm. |
| `columns` | Default `3`. |
| `sortTags` | Buttons you own. `onRemove` is not caught. |
| Label props | Same as AutoForm. Passed layout wins over the provider. |

## Query values

| `match` | Value |
| --- | --- |
| omitted | `"eq"`, or `"in"` when the value is an array. |
| `"contains"` | Substring. `ignoreCase: true` folds case. |
| `"between"` | `[from, to]`. A scalar warns `RAC-FIELD-BETWEEN` and does not match rows. |
| `"isNull"` | Matches null or undefined. The entered value is ignored. |
| empty | `undefined`, `null`, `""`, and empty arrays are omitted, except `"isNull"`. |

`includeNull: true` OR-s an `isNull` condition. `searchFields` OR-s the same comparison across those row keys instead of `name`.

Reset restores `defaultValue` and then searches. `serializeRsql` throws `RAC-QUERY-FIELD` when a field name is not `/^[\w.]+$/`.

## Preconditions

Import `style.css` once (`RAC-CSS-MISSING` in development). `AutoConfigProvider` is optional and only supplies layout, translation, and access.
