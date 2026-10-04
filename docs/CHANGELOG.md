# Changelog

**English** | [简体中文](i18n/zh-CN/CHANGELOG.md) | [繁體中文](i18n/zh-TW/CHANGELOG.md) | [日本語](i18n/ja/CHANGELOG.md) | [한국어](i18n/ko/CHANGELOG.md) | [Español](i18n/es/CHANGELOG.md) | [Français](i18n/fr/CHANGELOG.md) | [Deutsch](i18n/de/CHANGELOG.md) | [Português (Brasil)](i18n/pt-BR/CHANGELOG.md) | [Русский](i18n/ru/CHANGELOG.md)

## 0.2.0 - 2026-10-04

- Add `createAutoAccess`. The host owns one access store per browser tab and passes it through `config.access`. State changes refresh consumers, storage namespaces scope by user id, and identity changes remount provider descendants. `hasPerm`, `hasRole`, `hasUser`, and `hasOrg` compose with custom `canAccess` policies.
- Add a dark color scheme. The palette follows `prefers-color-scheme` automatically; set `data-auto-theme="light"` or `"dark"` on any ancestor to force one side.
- Add an `AutoTabs` data interface. Pass `source` as a `({ signal }) => Promise<AutoTab[]>` function or a `config.tabsSources` key instead of local `items`. Loading shows a status line, a rejection shows `error.message` with Retry, an unknown key warns `RAC-TABS-SOURCE`, and loaded items become route children.
- Fix `equal` so arrays no longer compare equal to objects with identical numeric keys.
- Stop the cascader on cyclic option trees and close the virtual select on an outside pointer down.
- Unify `hidden` resolution across menus, routes, and access checks; route children declared as plain strings normalize to `{ id }` entries.
- Remove the deprecated top-level search props (`match`, `ignoreCase`, `includeNull`, `searchFields`, `more`) and the `AutoSearchPanel` alias. Specify them on `field.search` and use `AutoSearch`.
- Remove the deprecated `hashSync` prop on `AutoNavigationProvider`; pass `history={createHashHistory()}`. Remove the deprecated `tip` prop on `tip` and `append` display items; use `content`.
- Document i18n integration in the README: a react-i18next bridge through `config.t`, per-component label overrides, and `Field.lang` keys.

## 0.1.4 - 2026-10-03

- Add `AutoNavigation`. Mounted components register on a path tree. `goto` supports relative paths, access checks, and an abort signal. Committed locations sync through hash, browser, or memory history. `AutoMenu` and `AutoTabs` accept `route` and follow the active child.
- Add `AutoTip` and `DefaultTip`. Field, column, menu, and tab tips float. Display types `tip` and `append` stay inline. The component on the item wins, then the owning component, then `config.form`, `config.table`, `config.tabs`, or `config.menu`, then `config.tipComponent`.
- `AutoSearch` `mode` defaults to `"instant"`. Hidden fields and fields that fail `canAccess` stay on the values object and are omitted from the query. Put search options on `search`; the old top-level `match` props still work.
- `AutoTable` `toolbarActions` shows or hides Refresh, Settings, Export, and JSON. `handle.refresh()` and `handle.export()` stay available. Sort tags appear when two or more columns are sorted.
- Forms accept `classNames` and `styles` slots, a `divider` display item, and `virtual-select`.

## 0.1.3 - 2026-10-02

- Built-in UI text defaults to English, and that same string is the `config.t` key. Pass `t` for other languages. Previous Chinese keys such as `提交` and `刷新` are no longer the defaults.
- The search form is `AutoSearch` (`AutoSearchProps`). `AutoSearchPanel` and `AutoSearchPanelProps` remain as deprecated aliases.
- `Field<T>` is a discriminated union. `select` without `options`, a scalar on `daterange` or `datetimerange`, and `match: "between"` on a scalar are TypeScript errors. `AnyField` and `unsafeField()` remain the escape hatch.
- Developer errors are English `RacError`s with a component, a fix, and a code. See [errors.md](errors.md). Development warnings cover a missing stylesheet, an empty table id, duplicate `rowKey`s, choice fields without options, and between or range values that are not pairs.
- `AutoConfigProvider` accepts JSON registries: `config.fields`, `config.columns`, `config.rowActions`, and `config.sources`. A string key resolves `Field.component`, column `render` / `format` / `sort` / `exportFormat`, `RowAction.action`, and `AutoTable` `source`. A function on the field, column, or action wins. Nested providers merge, and later keys win. Pass exactly one of `data`, `dataSource`, or `source`. An unknown source shows `RAC-TABLE-SOURCE` with retry.
- Add stable `data-testid="rac-*"` hooks for fields, tables, search, forms, and dialogs. They do not follow the translated label.
- Add `useAutoTabsWorkspace` to open, switch, and close dynamic tabs, including pinned tabs and optional session storage. A tab can be `closable`, `lazy`, `disabled`, or `loading`.
- Behavior notes: [AutoForm](auto-form.md), [AutoSearch](auto-search.md), [AutoTable](auto-table.md), [AutoDialog](auto-dialog.md), [AutoTabs](auto-tabs.md), [AutoMenu](auto-menu.md). `llms.txt` at the package root is the entry point for agents.
- A `v*` tag publishes to npm through GitHub Actions trusted publishing. `./run.sh release` bumps the patch version on a clean `main` branch.

## 0.1.2 - 2026-10-01

- Publish `@zeroman.yang/react-auto-components`. The `@zeroman` npm scope belongs to another account.

- Add AutoChat with caller-owned message rendering, streaming follow, history anchoring, an optional composer, and a ten-language demo; no new runtime dependencies.

- The online demo now shows each example's real source code in a View code dialog with file tabs, one-click copy, and GitHub links.
- Schema-driven React 19 components: AutoForm, AutoSearchPanel, AutoTable, AutoDialog, AutoTabs, and AutoMenu.
- Global size and density, form-label layouts, persisted table settings, and optional XLSX export.
- A real tarball consumer project, unit tests, type checks, and Chromium interaction tests.
- MIT license, contribution guide, GitHub CI, issue templates, and npm account setup and publishing instructions.
- English documentation by default, with complete translations and language-switch links.
