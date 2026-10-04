# AutoSearch

**English** | [简体中文](i18n/zh-CN/auto-search.md) | [繁體中文](i18n/zh-TW/auto-search.md) | [日本語](i18n/ja/auto-search.md) | [한국어](i18n/ko/auto-search.md) | [Español](i18n/es/auto-search.md) | [Français](i18n/fr/auto-search.md) | [Deutsch](i18n/de/auto-search.md) | [Português (Brasil)](i18n/pt-BR/auto-search.md) | [Русский](i18n/ru/auto-search.md)

Search form. It renders an `AutoForm` and emits both a `QueryNode` and the raw values. Instant edits and submit use the [AutoForm](auto-form.md) field validation rules. Reset restores the default filters without validation.

Field tips use the same mechanism as AutoForm. AutoSearch passes its `tipComponent` to the inner form.

Resolution order is the item/field/column parameter, the owning component parameter, provider component defaults (`config.tabs`, `config.form`, `config.table`, or `config.menu`), shared `AutoConfigProvider.config.tipComponent`, then built-in `DefaultTip`. Custom components receive `{ content, children, placement }` (`AutoTipProps`) and must preserve the trigger events, ref and accessibility props. `AutoTip` and `DefaultTip` are public exports; the default uses a portal, supports Escape, and keeps the trigger in place.

## Usage

```tsx
import { AutoSearch } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

<AutoSearch
  fields={[
    { name: "name", label: "Name", search: { match: "contains" } },
    {
      name: "period",
      type: "daterange",
      label: "Period",
      search: { match: "between" },
    },
  ]}
  onSearch={(query, values) => load(query, values)}
/>;
```

`period` on the model must be a two-item tuple when `type` is `daterange` or `search.match` is `"between"`.

## Behavior and props

| Prop                      | Behavior                                                                                                                                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fields`                  | Same `Field<T>` contract as AutoForm. Search configuration (`match`, `ignoreCase`, `includeNull`, `searchFields`, `more`) is specified via `search?: SearchConfig`. `more: true` hides the field until "More" is expanded. Hidden fields are left out of the query.     |
| `onSearch(query, values)` | Required. May return `void` or `Promise<void>`. **Every trigger catches throw/reject: values stay and `error.message` is shown. A failed search never resets the draft.** Errors from older searches are ignored after newer input, reset, or an external value change. |
| `onChange`                | Fires for edits and for reset, before `onSearch` on an instant search.                                                                                                                                                                                                  |
| `mode`                    | Default `"instant"`: validates every change and searches only when valid; submit also validates, while reset searches defaults directly. Set `"manual"` to search only on submit or reset.                                                                              |
| `value`, `defaultValue`   | Same controlled and reset rules as AutoForm.                                                                                                                                                                                                                            |
| `columns`                 | Default `3`.                                                                                                                                                                                                                                                            |
| `sortTags`                | Buttons you own. `onRemove` is not caught.                                                                                                                                                                                                                              |
| `classNames`, `styles`    | Slot-based styling: `classNames?: AutoSearchClassNames` (`root`, `form`, `actions`, `search`, `reset`, `moreToggle`) and `styles?: AutoSearchStyles`.                                                                                                                   |
| Label props               | Same as AutoForm. Passed layout wins over the provider.                                                                                                                                                                                                                 |
| `searchLabel`, `resetLabel` | Replace the built-in action labels. Defaults are localized via `config.t`.                                                                                                                                                                                              |

## Query values

| `match`      | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| omitted      | `"eq"`, or `"in"` when the value is an array.                               |
| `"contains"` | Substring. `ignoreCase: true` folds case.                                   |
| `"between"`  | `[from, to]`. A scalar warns `RAC-FIELD-BETWEEN` and does not match rows.   |
| `"isNull"`   | Matches null or undefined. The entered value is ignored.                    |
| empty        | `undefined`, `null`, `""`, and empty arrays are omitted, except `"isNull"`. |

`includeNull: true` OR-s an `isNull` condition. `searchFields` OR-s the same comparison across those row keys instead of `name`. These options live on `field.search = { match, ignoreCase, includeNull, searchFields, more }`; the former top-level spellings were removed in 0.2.0.

Instant validation includes `required` and synchronous/asynchronous `rules` on visible, accessible, enabled fields. Only the latest validated input emits a query. Pending requests are not cancelled automatically; the caller still owns result ordering or cancellation.

Reset clears validation and search errors, restores `defaultValue`, and searches exactly once without validation. This allows clearing filters even when a required field becomes empty. A reset search failure is displayed with the restored values intact. `serializeRsql` throws `RAC-QUERY-FIELD` when a field name is not `/^[\w.]+$/`.

## Preconditions

Import `style.css` once (`RAC-CSS-MISSING` in development). `AutoConfigProvider` is optional and only supplies layout, translation, and access.
