# AutoTable

**English** | [简体中文](i18n/zh-CN/auto-table.md) | [繁體中文](i18n/zh-TW/auto-table.md) | [日本語](i18n/ja/auto-table.md) | [한국어](i18n/ko/auto-table.md) | [Español](i18n/es/auto-table.md) | [Français](i18n/fr/auto-table.md) | [Deutsch](i18n/de/auto-table.md) | [Português (Brasil)](i18n/pt-BR/auto-table.md) | [Русский](i18n/ru/auto-table.md)

Table with local or remote rows, sort, filter, selection, optional virtualization, and CRUD dialogs. Search fields follow [AutoSearch](auto-search.md). Add and edit dialogs follow [AutoDialog](auto-dialog.md) and [AutoForm](auto-form.md).

Pass exactly one of `data`, `dataSource`, or `source`. Combining them is a type error.


Columns accept `tip: ReactNode`, shown through a help button beside the header. The table passes `tipComponent` to column tips, search fields and its add/edit dialog; `searchLayout.tipComponent` can override search help. Within the table, the fallback is table prop → `config.table.tipComponent` → global `config.tipComponent` → `DefaultTip`; nested search/edit forms do not fall back to `config.form.tipComponent`. Standalone AutoSearch/AutoDialog continue to use form defaults.

Resolution order is the item/field/column parameter, the owning component parameter, provider component defaults (`config.tabs`, `config.form`, `config.table`, or `config.menu`), shared `AutoConfigProvider.config.tipComponent`, then built-in `DefaultTip`. Custom components receive `{ content, children, placement }` (`AutoTipProps`) and must preserve the trigger events, ref and accessibility props. Tooltips are rendered through internal integration; `DefaultTip` is exported as the built-in floating fallback (uses a portal, supports Escape, and keeps the trigger in place).

## Usage

```tsx
import { AutoTable } from "@zeroman.yang/react-auto-components";
import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx";
import "@zeroman.yang/react-auto-components/style.css";

<AutoTable
  id="orders"
  rowKey="id"
  title="Orders"
  headerExtra={<span className="auto-muted">Realtime sync</span>}
  data={rows}
  columns={[{ key: "id", label: "Id" }]}
  actions={<button type="button">Import</button>}
  batchActions={(selected) => (
    <button type="button" onClick={() => archive(selected)}>
      Archive ({selected.length})
    </button>
  )}
  onAdd={(values) => createOrder(values)}
  onDelete={(selected) => deleteOrders(selected)}
  exportXlsx={exportXlsx}
/>
```

Sort tags appear only for multi-column sorting (two or more active sort fields) and share the title row by default (`sortTagsLayout="inline"`). Set `sortTagsLayout="separate"` to display them on a separate row below the toolbar. With zero or one sort field, neither layout reserves space for tags; sorted column headers show a highlighted direction indicator.

`exportXlsx` is imported from `@zeroman.yang/react-auto-components/xlsx`, not the main entry. `exceljs` is an optional dependency (`RAC-XLSX-DEP` if it is missing).

## JSON-driven table (zero function props)

Use this as the integration template for a JSON-producing service such as `zm_api`: the host registers executable behavior once; the table description contains only JSON. The endpoint below is an example host API, not a built-in library endpoint.

Save this description as `orders.table.json`:

```json
{
  "id": "orders",
  "rowKey": "id",
  "source": "orders.list",
  "pageSize": 10,
  "columns": [
    { "key": "id", "label": "Id" },
    { "key": "customer", "label": "Customer" },
    { "key": "paid", "label": "Paid", "component": "paid-label" }
  ],
  "searchFields": [
    { "name": "customer", "label": "Customer", "type": "input", "match": "contains" }
  ],
  "rowActions": [
    { "id": "inspect", "label": "Inspect order", "action": "orders.inspect" }
  ]
}
```

Register the keys in the React host, then pass the description unchanged:

```tsx
import {
  AutoConfigProvider,
  AutoTable,
  type AutoServices,
  type AutoTableProps,
} from "@zeroman.yang/react-auto-components";
import descriptionJson from "./orders.table.json";
import "@zeroman.yang/react-auto-components/style.css";

type Order = { id: string; customer: string; paid: boolean };
const description = descriptionJson as AutoTableProps<Order>;

const config = {
  namespace: "orders-app",
  sources: {
    "orders.list": async (query, { signal }) => {
      const response = await fetch("/api/orders/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
        signal,
      });
      if (!response.ok) throw new Error(`Load orders failed: ${response.status}`);
      return (await response.json()) as { rows: Order[]; total: number };
    },
  },
  columns: {
    "paid-label": { format: (value) => (value ? "Paid" : "Unpaid") },
  },
  rowActions: {
    "orders.inspect": (row) => {
      window.alert(`Order ${(row as Order).id}`);
    },
  },
} satisfies Partial<AutoServices>;

export default function OrdersPage() {
  return (
    <AutoConfigProvider config={config}>
      <AutoTable<Order> {...description} />
    </AutoConfigProvider>
  );
}
```

The host endpoint receives `{ pageIndex, pageSize, sort, filter }` (`pageIndex` is zero-based; `filter` is the [query AST](auto-search.md)). It must apply filtering and sorting before paging and return, for example, `{ "rows": [{ "id": "o-1", "customer": "Ada", "paid": true }], "total": 1 }`. `total` is the full filtered count. Searching or paging calls the registered source again; a rejected request appears in the table with retry. Right-click a row to choose **Inspect order**.

All functions stay in `config`; no function is passed in the table description. `source`, column `component`, and row `action` name host registrations. Custom form/search widgets can likewise use `Field.component` with `config.fields`. These registries do not replace the built-in CRUD callbacks (`onAdd`, `onEdit`, `onDelete`); use registered row actions for custom workflows. Type assertions above describe the agreed data contract, not runtime validation: validate externally supplied descriptions and responses at the host boundary.

For isolated renders during AI/browser verification, see the [deterministic testing recipe](../llms.txt#deterministic-testing).

## Behavior and props

| Prop | Behavior |
| --- | --- |
| `id` | Required. Settings key is `${namespace}:table:${id}`. An empty id warns `RAC-TABLE-ID`. |
| `rowKey` | Field name or `(row) => string`. Must be unique on the loaded rows. Missing or duplicate ids warn `RAC-TABLE-ROWID`. Selection, expansion, and `scrollToRow` use it. |
| `data` | Local rows. Filtering and paging happen in the browser. |
| `dataSource(query, { signal })` | Remote page. **Reject: the message is shown with a retry button. Abort is ignored.** Return `{ rows, total }` where `total` is the full filtered count. |
| `columns` | Omit to use the first row's keys, skipping `_auto_*`. Column `type` formats values; it is not a form widget. Column `formField?: Partial<Field<T>> | false` customizes or skips the derived form field in add/edit dialogs. |
| `pageSize` | Default `10`. `pagination` default `true`. |
| `height` | Default `440` pixels. `"auto"` fills a parent that already has a height. |
| `virtual` | Optional. Measures rows with TanStack Virtual. |
| `query`, `onQueryChange` | Controlled query. Omit to keep page, sort, and filter inside the table (sort and filter also follow saved presets). |
| `searchFields` | Renders `AutoSearch`. Its `onSearch` updates the table filter. The record count lives in the pagination footer. |
| `searchInline` | Default `false`. `true` renders a single-line toolbar: the search fields lead, actions and tools sit right, and the title is omitted (the record count stays in the pagination footer). `false` keeps the search panel on its own row above the toolbar, next to the title. |
| `formFields` | Schema for the add/edit dialog. If omitted, fields are inferred from `columns`. Column `formField: false` excludes the column; `formField: { ... }` overrides field properties (e.g. `type`, `options`, `rules`). Columns with `options` become `select`, `date`/`datetime`/`percentage`/`progress` map to matching field types, and `number` becomes `integer`. |
| `onAdd`, `onEdit`, `onDelete` | Called from the dialog after validation. **Reject or throw: the dialog stays open and shows `error.message`. Rows do not change unless your handler already changed them.** |
| `rowActions` | Context menu actions on row right-click. **`onClick` rejection is caught and shown in the status line for about 2.5s.** The row stays. `action` is a `config.rowActions` key used when `onClick` is omitted. Neither one warns `RAC-ROW-ACTION` and the status shows the message. Items support `icon`, `danger`, `separator`, `disabled`, and `hidden`. |
| `component` on a column | Key in `config.columns` for `render`, `format`, `sort`, and `exportFormat`. A function on the column wins. An unknown key warns `RAC-COLUMN-COMPONENT` and the cell uses the default format. |
| `source` | Key in `config.sources`. Pass exactly one of `data`, `dataSource`, or `source`. An unknown key warns `RAC-TABLE-SOURCE` and the table shows that message with retry. |
| `exportXlsx` | Required only for xlsx. Missing adapter throws `RAC-TABLE-XLSX` and the status shows the translated adapter sentence. CSV and JSON are built in. |
| `versions` | Bump a layout, sort, filter, or export version to drop that saved preset. |
| `summaryValues` | Server totals for the filtered result, keyed by column. |
| `actions` | Primary or custom business actions rendered in the right header toolbar before system tools. |
| `batchActions` | `(selectedRows: T[]) => ReactNode`. Custom batch action buttons displayed in the dynamic selection bar when rows are selected. `onDelete` renders `Delete selected` here. |
| `headerExtra` | Extra content adjacent to title and record count in the left header toolbar. |
| `reorderableColumns` | Default `true`. Enable dragging column headers directly to reorder columns. Column `reorderable: false` disables reordering for a specific column. Reordering persists to saved layout settings. |
| `toolbarActions` | Refresh, settings, export, and JSON. Default all shown in compact icon mode (`mode: "icon"`). Set `mode: "text"` or `"both"` to customize button appearance. `false` hides the four buttons. An object hides only the buttons set to `false`. `extra` appends custom tools. `handle.refresh()` and `handle.export()` stay available. |

### Data source stability and in-place switching

When switching data sources (`source` or `dataSource` changes), `AutoTable` switches sources **in place** rather than unmounting or recreating the component:
- **Row retention (SWR)**: Previous rows stay visible with an indeterminate loading progress bar and `aria-busy="true"` on the table body to prevent jarring layout shifts or white flashes during in-flight requests.
- **Page reset**: `pageIndex` automatically resets to `0` because pagination belongs to the previous request's dataset size.
- **Selection clear**: Row selections from the previous dataset are cleared.
- **Empty state timing**: The table only transitions to the empty state (`props.empty` or "No data") after the new request settles with zero rows.

**Stability contract**: `dataSource` function identity is a reactive signal. If you pass an inline arrow function (`<AutoTable dataSource={(q) => fetch(q)} />`), every parent render will trigger a re-fetch. Always stabilize `dataSource` with `useCallback` or module-level declaration, or pass a static `source="name"` with `AutoConfigProvider`.

**Local data exception**: In local controlled mode (`<AutoTable data={rows} />`), row data is managed entirely in caller state. If caller clears state (`setRows([])`) before fetching, `AutoTable` receives an empty array directly. To benefit from smooth in-place SWR transitions, migrate to `dataSource` or `source`.

## Export and settings

`handle.export(format, scope)` resolves even when the status shows an error; the error is not rethrown. `scope` `"filtered"` on a remote table walks every page. An empty page before the last page throws `RAC-TABLE-EXPORT-PAGE` and does not download a partial file.

Saved layout, sort, filter, and export use `config.storage` (`localStorage` by default) and, when set, `config.settings`. A failed `settings.save` / `load` shows "Could not save settings" and a retry button. The in-memory table keeps working.

Invalid filter JSON in the settings dialog shows the translated "Invalid filter", warns `RAC-TABLE-FILTER`, and keeps the previous filter. `between` must be a two-item array. `in` must be an array.

`handle.reset()` clears sort, filter, selection, and puts the layout back on the column defaults. `handle.refresh()` re-runs `dataSource`. `handle.scrollToRow(id)` does nothing when that id is not loaded.

The table root is `data-testid="rac-table-{id}"`. Inside it: `rac-add`, `rac-delete-selected`, `rac-refresh`, `rac-settings`, `rac-export`, `rac-edit-{rowId}`, `rac-delete-{rowId}`. The ids do not follow the UI language. See [llms.txt](../llms.txt).

## Preconditions

Import `style.css` once. Set `AutoConfigProvider` `namespace` when more than one app on the same origin persists tables; the default namespace is `"auto"`. `AutoDialogProvider` is not required for the built-in add/edit dialogs; those use the declarative dialog. It is required only for `useAutoDialog()`.
