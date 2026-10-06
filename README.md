# React Auto Components

**English** | [简体中文](docs/i18n/zh-CN/README.md) | [繁體中文](docs/i18n/zh-TW/README.md) | [日本語](docs/i18n/ja/README.md) | [한국어](docs/i18n/ko/README.md) | [Español](docs/i18n/es/README.md) | [Français](docs/i18n/fr/README.md) | [Deutsch](docs/i18n/de/README.md) | [Português (Brasil)](docs/i18n/pt-BR/README.md) | [Русский](docs/i18n/ru/README.md)

A standalone, schema-driven component library for React 19, covering forms, tables, and chat. Built with TypeScript, TanStack Table 9 / Form / Virtual, Radix, and Floating UI, without Ant Design, Element Plus, or MUI. Library builds use React Compiler.

[![Auto Studio Demo Preview](docs/assets/demo.png)](https://zeroman.github.io/react-auto-components/)

<p align="center">
  <a href="https://zeroman.github.io/react-auto-components/"><strong>🚀 Live Demo (GitHub Pages)</strong></a> · <a href="#demo-and-test-project">Run Locally</a> · <a href="#components">Components</a>
</p>

## Project status

The current version is 0.3.0 and APIs may still change. React 19 is required. The package provides ESM and TypeScript declarations. Built-in interface text defaults to English and can be translated through AutoConfigProvider.config.t.

Agents: start at [llms.txt](llms.txt). It indexes the behavior docs, error codes, JSON registries, and Playwright ids.

Install with `pnpm add @zeroman.yang/react-auto-components` (npm and yarn work the same way). React 19 and react-dom 19 are peer dependencies. Import the stylesheet once: `import "@zeroman.yang/react-auto-components/style.css"`.

- [Live Demo (GitHub Pages)](https://zeroman.github.io/react-auto-components/)
- [Contributing](https://github.com/Zeroman/react-auto-components/blob/main/.github/CONTRIBUTING.md)
- [Changelog](https://github.com/Zeroman/react-auto-components/blob/main/docs/CHANGELOG.md)
- [Account setup and publishing](https://github.com/Zeroman/react-auto-components/blob/main/docs/publishing.md)
- [MIT license](LICENSE)

## Demo and test project

Try the **[Online Demo](https://zeroman.github.io/react-auto-components/)** directly in your browser.

To run or develop the test project locally (requires Node.js >= 22.12 and pnpm 12.5):

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

Open http://127.0.0.1:4173. The test project includes pages for all seven components, local/server-side/100,000-row/tree/expandable-row tables, CRUD, failed-submission retries, drafts, nested tabs, and dynamic row heights.

The demo automatically detects the browser language, with English as the fallback. Choose a language from the header or Global settings; the selection is remembered across reloads. Select Auto to follow the browser again. Ten languages are supported. Pages fill the viewport, with tables and long panels scrolling inside their own areas.

Every example page includes a **View code** button that opens its real source file in a dialog, with file tabs, one-click copy, and a GitHub link.

`test-project` has its own package.json and lockfile. It installs the actual output of `pnpm pack`, with no source aliases. Run `pnpm prepare:test-project` again after changing the library; the script uses content-hashed filenames to avoid stale tarball caches.

### Automated demo workflow

The demo build and screenshot capture process is automated and reusable:

```sh
pnpm demo:update       # Full update: rebuilds library, updates test-project, builds demo-dist, and refreshes screenshot
pnpm demo:build        # Compiles static demo files to demo-dist for GitHub Pages
pnpm demo:screenshot   # Takes fresh high-resolution screenshot using headless Chromium to docs/assets/demo.png
```

Pushes to `main` branch automatically build and publish static files to GitHub Pages via GitHub Actions.

## Usage

```tsx
import { useState } from "react";
import {
  AutoConfigProvider,
  AutoDialogProvider,
  AutoTable,
  type AutoColumn,
  type Field,
} from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

type Person = { id: number; name: string; enabled: boolean };
const columns: AutoColumn<Person>[] = [
  { key: "name", label: "Name", sortable: true },
  {
    key: "enabled",
    label: "Enabled",
    options: [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ],
  },
];
const fields: Field<Person>[] = [
  { name: "name", label: "Name", required: true },
  { name: "enabled", label: "Enabled", type: "switch", defaultValue: true },
];
export function App() {
  const [rows, setRows] = useState<Person[]>([]);
  return (
    <AutoConfigProvider config={{ namespace: "my-app" }}>
      <AutoDialogProvider>
        <AutoTable<Person>
          id="people"
          rowKey="id"
          data={rows}
          columns={columns}
          formFields={fields}
          searchFields={fields}
          onAdd={(value) =>
            setRows((old) => [...old, { ...value, id: Date.now() }])
          }
          onEdit={(row, value) =>
            setRows((old) =>
              old.map((item) =>
                item.id === row.id ? { ...row, ...value } : item,
              ),
            )
          }
          onDelete={(selected) =>
            setRows((old) =>
              old.filter((item) => !selected.some((row) => row.id === item.id)),
            )
          }
        />
      </AutoDialogProvider>
    </AutoConfigProvider>
  );
}
```

Fields, columns, and refs use generics: invalid field names or default values produce compile-time errors. The provider supports namespaces, permissions, field-label translation, custom fields, notifications, and persistence adapters. Built-in labels, validation messages, and accessibility text use AutoConfigProvider.config.t; explicit component labels take precedence.

### Internationalization (i18n)

Built-in interface text defaults to English. Component strings pass through `AutoConfigProvider.config.t(key, fallback)`. Explicit component-level label props (e.g. `confirmLabel`, `submitLabel`, `labels`) take precedence over `config.t`.

The `t` callback receives a message key and a fallback. Preserve numbered placeholders such as `{0}` and `{1}` in translated built-in messages; components substitute their values after translation.

#### Integration with react-i18next

Pass a bridge function to `config.t`:

```tsx
import { useTranslation } from "react-i18next";
import { AutoConfigProvider } from "@zeroman.yang/react-auto-components";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <AutoConfigProvider
      config={{
        t: (key, fallback) => t(key, { defaultValue: fallback ?? key }),
      }}
    >
      {children}
    </AutoConfigProvider>
  );
}
```

#### Component label overrides

- **`AutoDialog`**: `confirmLabel="Save"`, `cancelLabel="Discard"`
- **`AutoForm`**: `submitLabel="Submit"`, `resetLabel="Reset"`
- **`AutoSearch`**: `searchLabel="Query"`, `resetLabel="Clear"`
- **`AutoChat`**: `labels={{ send: "Send", stop: "Stop", conversation: "Chat" }}`
- **`Field<T>`**: `lang="user.name"` translates `label` via `config.t("user.name", field.label)`

## Components

| Component       | Capabilities                                                                                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AutoForm        | Native field types, virtualized options, cascading selection, upload adapters, custom rendering, dependent fields, conditional visibility, async validation, controlled state, input preservation after failures |
| AutoSearch | Basic/advanced conditions, manual/instant search, reset, sort tags, a shared query AST with RSQL serialization and `search.*` config                                                                            |
| AutoTable       | Local/remote data, multi-column sorting, column filters, pagination, stable selection, virtualization, tree/detail expansion, summaries, merged cells, CRUD, context menus, and copy                             |
| AutoDialog      | Declarative/imperative APIs, isolated providers, drafts, close guards, focus management, dragging, fullscreen, and async submission                                                                              |
| AutoTabs        | Horizontal/vertical layouts, nesting, permissions, disabled tabs, preserved panel state, refresh, and an async `source` (`config.tabsSources`) with loading, error and retry states                          |
| AutoMenu        | Sidebar navigation with icons, descriptions, badges, nested groups, permissions, and a collapsible icon rail                                                                                                     |
| AutoChat | Caller-owned message rendering, optional virtualization, streaming follow, anchored history loading, send/stop composer, and custom actions. [Behavior](docs/auto-chat.md) |

Behavior contracts, including what a thrown callback does: [AutoForm](docs/auto-form.md), [AutoSearch](docs/auto-search.md), [AutoTable](docs/auto-table.md), [AutoDialog](docs/auto-dialog.md), [AutoTabs](docs/auto-tabs.md), [AutoMenu](docs/auto-menu.md). Developer error codes: [errors.md](docs/errors.md).

## Preconditions

Import the stylesheet once: `import "@zeroman.yang/react-auto-components/style.css"`. Without it, `--auto-text` is unset and the page is unstyled. Development mode warns `RAC-CSS-MISSING`. The palette follows `prefers-color-scheme` automatically; set `data-auto-theme="light"` or `"dark"` on any ancestor (typically `<html>`) to force one side.

`AutoConfigProvider` is optional. Defaults are namespace `"auto"`, size `"medium"`, density `"comfortable"`, top labels, and `localStorage`. The namespace is prefixed onto `${namespace}:table:${id}` and `${namespace}:draft:${draftKey}`. Two apps on one origin that both keep `"auto"` share those keys.

`AutoDialogProvider` is required for `useAutoDialog()` and is not provided by `AutoConfigProvider`. `<AutoDialog open>` does not need it.

`exceljs` is an optional dependency used only by `@zeroman.yang/react-auto-components/xlsx`. CSV and JSON export work without it. A missing adapter or a missing `exceljs` install fails with `RAC-TABLE-XLSX` or `RAC-XLSX-DEP`.

Table layout, sorting, filtering, and export each support named presets and independent versions. Persistence defaults to localStorage; remote adapters can be injected. JSON/CSV export is built in. XLSX uses an optional, separate adapter:

```tsx
import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx";
// <AutoTable ... exportXlsx={exportXlsx} />
```

ExcelJS loads dynamically when the adapter is first used and is excluded from the library's main entry. Applications that only use CSV/JSON can omit optional dependencies during installation.

## External access state

Create a `createAutoAccess()` store inside each browser tab and pass it through `config.access`. Tabs can stay logged in as different users simultaneously; there is no browser-wide current-user singleton. The host owns login, API requests and realtime updates; the library only stores the snapshot and notifies consumers.

```tsx
import { createAutoAccess, AutoConfigProvider } from "@zeroman.yang/react-auto-components";

export const access = createAutoAccess();
// Once per app; create a separate instance per SSR request.
<AutoConfigProvider config={{ namespace: "my-app", access }}>
  <App />
</AutoConfigProvider>;

// The external application calls these after loading or updating identity data.
access.replaceState({ userId: "alice", roles: ["editor"], permissions: ["project:read"], orgIds: ["north"] });
access.setState({ permissions: ["project:read", "project:edit"] });
access.reset(); // Logout: clear identity and every grant.
```

The store exposes `hasPerm(code)`, `hasRole(role)`, `hasUser(userId)` and `hasOrg(orgId)`. `getState()` returns a stable, immutable snapshot; `subscribe(listener)` supports non-React consumers. React consumers can read `useAutoConfig().access`; provider updates refresh them automatically.

`setState` merges a patch, replacing supplied arrays. Changing `userId` also clears omitted grants. `replaceState` always clears omitted fields and is the preferred account-switch API. Roles do not implicitly grant permissions. The built-in `canAccess` requires **every** declared role and permission; fields with no requirements remain public. A custom `config.canAccess` overrides that policy and can use all four helpers. The existing schema still uses `roles`/`permissions`; use the helpers for caller-owned user/organization conditions.

When `userId` changes, the provider remounts its descendants, clearing their in-memory forms, dialogs and component state. Built-in persisted settings and drafts use `${namespace}:user:${JSON.stringify(userId)}` as their namespace; switching back restores only that account's saved data. Updating grants for the same user keeps current edits. Put user-owned components below this provider; host-owned stores, navigation instances and requests outside it must be cleared/cancelled by the host. Protect pending identity loads with an AbortSignal/request generation so an old user's response cannot replace the new user. Each Chrome tab has its own store: replacing or resetting tab A does not replace or log out tab B. Do not broadcast a single current-user snapshot through localStorage. The host must bind each tab's API requests to that tab's authenticated session; one shared login cookie alone cannot represent two independent users. Frontend access state does not change the server's authentication context.

Without `config.access`, existing `canAccess` behavior and storage keys stay unchanged. The Demo's **Permissions** tab includes initial mock loading, independent role/permission changes, account switching, delayed-response cancellation and retry. Its mock API lives in `test-project/src/examples/mock/access.ts`, outside the library. The Demo stores only the selected mock user in sessionStorage, so refreshing a tab keeps its own identity (including logout). Links open another user in a new tab using a one-time demo-only user selector; it is not an authentication credential. Two-page tests use the same browser context, sharing cookies/localStorage while verifying independent users, grants and logout.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium  # First run only
pnpm test:e2e
```

Unit tests cover fields, async validation, queries, dialogs, virtualization, tables, configuration migrations, and exports. Playwright tests interactions through the packaged public entry points. Desktop/mobile screenshots are written to `test-project/test-results`.

## Behavior and conventions

- This is a React-native API, not a property-by-property or method-by-method compatibility layer for Vue. See the [migration guide](docs/migration.md).
- Application code owns the data. CRUD callbacks persist changes; throwing on failure preserves edits. After success, the component refreshes remote data. Local data must be updated by the caller.
- A table's `id` must be unique within its namespace, and `rowKey` must be unique across all pages and tree nodes. In server-side mode, provide `columns` explicitly; the data source returns the total count.
- When `query` / `value` is controlled, the parent must handle callbacks and update it. These props can be omitted for uncontrolled use.
- Merged cells use a non-virtualized semantic table, suitable for paginated data, to avoid rowSpan misalignment across virtual windows.
- Server-side summaries for all filtered rows are supplied through `summaryValues`. Missing summaries display `—` instead of presenting the current page's total as an overall total. Set `summaryScope="page"` to calculate the current page explicitly.
- Submission pauses while uploads are in progress. Resetting, replacing field values, or unmounting cancels old uploads; late results cannot overwrite newer values.
- Remote exports of all filtered results request data one page at a time. Large applications can implement their own server-side export.
- Import browser styles explicitly from `style.css`. JavaScript modules can be imported in Node without `window`.

## Fill the remaining height with AutoTable

`height={440}` continues to set a fixed height for the data scroll area. With `height="auto"`, the entire table fills the height allocated by its parent layout. Search, toolbar, and pagination take their natural heights; the data area uses the remaining space and scrolls independently:

```tsx
<div
  style={{
    height: "100dvh",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  }}
>
  <header>Page title and description</header>
  <AutoTable<Person>
    id="people"
    rowKey="id"
    data={rows}
    columns={columns}
    height="auto"
  />
  <footer>Page footer</footer>
</div>
```

The parent must have a definite height. Use `flex: 1; min-height: 0` in nested flex containers to pass down the remaining space, or `grid-template-rows: auto minmax(0, 1fr) auto` for grid layouts. No JavaScript calculation of viewport height minus toolbar height is needed: layout handles added/removed search fields, wrapped toolbars, and parent resizing, and the virtual list follows the scroll area's actual dimensions.

This does not size the table according to the number of rows. Empty and small datasets still fill the available space. The parent must at least accommodate the search area, toolbar, and pagination themselves.

The test project demonstrates this in the **AutoTable → Remaining height** tab while preserving the sidebar and page header. The legacy URL `http://127.0.0.1:4173/?demo=auto-height` selects that tab directly. Browser tests: `test-project/tests/auto-height.spec.ts`.

## Global form layout

Use `AutoConfigProvider.config.form` to configure regular forms, search panels, table search areas, and dialog forms consistently. Labels can appear above or to the left of controls, with independent left/right text alignment. Defaults are top labels and comfortable spacing.

```tsx
<AutoConfigProvider
  config={{
    form: {
      labelPosition: "left", // 'top': above; 'left': to the left of the control
      labelAlign: "right", // Right-aligned text; the label stays left of the control
      labelWidth: 80,
      density: "compact", // 'comfortable': more spacing
    },
  }}
>
  <App />
</AutoConfigProvider>
```

Nested providers merge layout settings property by property. Explicit component props override the enclosing provider. For example, retain top labels in one form while using inline labels globally:

```tsx
<AutoForm fields={fields} labelPosition="top" density="comfortable" />
<AutoTable id="people" rowKey="id" data={rows} columns={columns}
  searchFields={searchFields}
  searchLayout={{ labelWidth: 100, columns: 3 }} />
```

`labelWidth` defaults to `"auto"` and also accepts a pixel number or CSS width such as `"6em"`. In automatic mode, each search label fits its text; regular forms and dialog forms share a width based on visible labels to align controls. Long labels occupy at most 45% of the field width and wrap beyond that, preserving room for controls. Explicit fixed widths are not subject to this automatic limit. Compact search areas place action buttons on the same row when space allows and wrap on narrow screens. Label associations remain intact, errors and descriptions align with controls, and long labels can wrap.

In the demo, open **Global settings** from the sidebar or the top-right gear to change layout, density, label width, and theme. Changes take effect immediately without clearing current inputs. The form page supports **Follow global** or local overrides. The demo explicitly enables compact inline layout through its provider.

## Global size and density

`AutoConfigProvider` supports `size: "small" | "medium" | "large"` and `density: "compact" | "comfortable"`. Explicit component props take precedence over component-category settings, which take precedence over global values:

```tsx
<AutoConfigProvider
  config={{
    size: "medium",
    density: "compact",
    form: { labelPosition: "left", labelAlign: "right" },
    table: { density: "compact" },
    tabs: { density: "compact" },
  }}
>
  <AutoForm fields={fields} size="small" />
</AutoConfigProvider>
```

Table density also supports `normal`. The table settings panel defaults to following global settings. Selecting compact, normal, or comfortable spacing overrides the global density and is saved with the layout preset; the component's `density` prop has the highest priority. Local sizes on nested components apply independently.

Forms support `resetLabel`, `extraActions`, and `onReset`; search panels support `searchLabel`, `resetLabel`, and `extraActions`; dialogs support `cancelLabel` and `extraActions`. `AutoTabs` items can define a `badge`, and `AutoTable.empty` customizes empty-state content.

### AutoChat

AutoChat provides a lightweight conversation layout with streaming follow, history loading and a composer. Supply React content or renderMessage for message rendering; no extra runtime dependencies are required.

[AutoChat API](docs/auto-chat.md)

### Component Navigation Tree (AutoNavigation)

`AutoNavigation` provides a declarative, tree-structured component navigation system. It separates location paths, parameters, access checks, and history synchronization, while enabling deep relative navigation (`./child`, `../sibling`), StrictMode-safe `AbortSignal` management, and seamless adapter integration with React Router, TanStack Router, Next.js, and static hash routes.

[AutoNavigation API & Router Integration](docs/auto-navigation.md)
