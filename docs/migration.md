# Component integration guide

**English** | [简体中文](i18n/zh-CN/migration.md) | [繁體中文](i18n/zh-TW/migration.md) | [日本語](i18n/ja/migration.md) | [한국어](i18n/ko/migration.md) | [Español](i18n/es/migration.md) | [Français](i18n/fr/migration.md) | [Deutsch](i18n/de/migration.md) | [Português (Brasil)](i18n/pt-BR/migration.md) | [Русский](i18n/ru/migration.md)

Configure components through React generics, callbacks, and providers. The following table maps common application needs to the public APIs and runnable examples.

| Original use case                       | React API                                                                        | Runnable example / test                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Form fields and v-model                 | `fields: Field<T>[]`, `value/onChange`, or `defaultValue`                        | Form page in `test-project/src/examples/FormDemo.tsx`; `tests/form*.test.tsx` |
| Slots and appended content              | Field `render`, column `render/header`, ReactNode                                | Form/table pages                                                              |
| Form instance operations                | `ref.validate/reset/getValues/setValue/focus`                                    | `tests/form.test.tsx`                                                         |
| Search, related conditions, RSQL        | `buildQuery`, `matchesQuery`, `serializeRsql`                                    | Search page; `tests/query.test.ts`                                            |
| Local/remote table data                 | Either `data` or `dataSource(query,{signal})`                                    | Table page; `tests/table.test.tsx`                                            |
| Layout/filter/sort/export presets       | Independent presets in the settings dialog, invalidated separately by `versions` | Table page; `tests/table-settings.test.ts`                                    |
| Trees, details, summaries, merged cells | `getChildren/renderExpanded`, column `summary/merge`                             | Tree and expansion examples; `tests/table-advanced.test.tsx`                  |
| Add, edit, delete                       | `formFields` and `onAdd/onEdit/onDelete`                                         | Browser CRUD tests                                                            |
| Imperative dialogs                      | `AutoDialogProvider` + `useAutoDialog().open()`                                  | Dialog page; `tests/dialog.test.tsx`                                          |
| Tabs and nested tabs                    | `AutoTabs` items, value/onChange, keepMounted                                    | Tabs page; `tests/tabs.test.tsx`                                              |
| Chat message lists and conversation UI  | `AutoChat`, `messages`, `onSend`, `renderMessage`                                | Chat pages in `test-project/src/examples/Chat*.tsx`; `tests/chat.test.tsx`    |

## Field types

`input/email/textarea/integer/float/percentage/progress/switch/select/select-v2/radio/checkbox/cascader/autocomplete/date/datetime/daterange/datetimerange/upload/text/title/tip/button/append/custom`.

`select-v2` virtualizes options. Date ranges use two native inputs with separate labels; `dateValue` chooses strings or timestamps. Numeric inputs allow intermediate editing states; use field rules to validate business constraints on submission. `rules` supports async validation, while hidden fields skip validation. Options preserve numeric/boolean values instead of coercing them to strings.

```tsx
const fields: Field<User>[] = [
  { name: "name", label: "Name", required: true },
  {
    name: "note",
    label: "Note",
    hidden: (values) => !values.enabled,
    render: ({ value, onChange, disabled }) => (
      <textarea
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
    ),
  },
];
```

See the exported TypeScript types for the full API. `Field<T>` binds to actual keys of T; structural items such as titles and tips do not need a data property.

## Server-side data sources

```tsx
const dataSource: DataSource<User> = async (query, { signal }) => {
  const response = await fetch("/api/users/search", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!response.ok) throw new Error("Failed to load");
  return response.json(); // { rows: User[], total: number }
};
```

Page indexes start at 0. `sort` is an ordered array of fields; `filter` is a structured query tree. Components cancel old requests and prevent late responses from overwriting newer queries. Call the table's `ref.refresh()` when business conditions outside the data-source closure change. Keep the data-source function stable to avoid unnecessary requests. RSQL serialization is only an adapter for backends that require it; it does not execute query strings.

## Application uploads and persistence

A field's `upload(files, signal)` returns the field value after the application saves the files. The component displays upload failures; callers provide upload URLs, authentication, and object-storage policies.

```tsx
<AutoConfigProvider
  config={{
    namespace: "tenant-admin",
    canAccess: (access) =>
      !access.permissions?.length ||
      access.permissions.every((p) => myPermissions.includes(p)),
    settings: {
      load: (key) => api.loadTableSettings(key),
      save: (key, settings) => api.saveTableSettings(key, settings),
    },
    notify: (message, level) => showToast(message, level),
  }}
>
  {children}
</AutoConfigProvider>
```

Local changes apply immediately; remote saves run serially, with a retry option after failures. When changing persisted settings formats, use a new table id or version to avoid loading incompatible settings.

## Removed in 0.2.0

- Top-level search props on fields (`match`, `ignoreCase`, `includeNull`, `searchFields`, `more`) — specify them on `field.search` (`SearchConfig`).
- `AutoSearchPanel` / `AutoSearchPanelProps` — use `AutoSearch` / `AutoSearchProps`.
- `hashSync` on `AutoNavigationProvider` — pass `history={createHashHistory()}`.
- `tip` on `tip` and `append` display items — use `content`.

## Removed in 0.4.0

- The `AutoTip` component export — tooltips render through internal integration now. Customize them through `tipComponent` (custom renderers receive `{ content, children, placement }` via `AutoTipProps` and must preserve the trigger events, ref, and accessibility props), or use the exported `DefaultTip` as the built-in floating fallback.

## Automatic focus

`AutoTabs` and `useAutoTabsWorkspace` no longer manage editor focus. Remove `restoreFocus`, `focusTarget`, and `autoFocusMode` from tab items, tab props, workspace options and page declarations. `TabFocusTarget` is removed. `data-autofocus` alone no longer has special behavior.

Wrap the desired entry in `<AutoFocus>`, or wrap panel content in `<AutoFocus target="textarea">`. To retain an existing marker, use `<AutoFocus target="[data-autofocus]">`. A DOM ref can be passed as `target` for editors exposing their focusable element. Move any conditional enablement to `<AutoFocus disabled={...}>`.

There is no historical-focus restoration or pointer-only mode. All selection methods use the same visibility-based behavior. Without AutoFocus, tabs do not move focus into their panels. See [AutoFocus](auto-focus.md) for ordering and visibility rules.

Arrow keys move focus between tab labels without switching panels. Click a label or press Enter/Space to activate it.
