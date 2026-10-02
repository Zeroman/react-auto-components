# Changelog

**English** | [简体中文](i18n/zh-CN/CHANGELOG.md) | [繁體中文](i18n/zh-TW/CHANGELOG.md) | [日本語](i18n/ja/CHANGELOG.md) | [한국어](i18n/ko/CHANGELOG.md) | [Español](i18n/es/CHANGELOG.md) | [Français](i18n/fr/CHANGELOG.md) | [Deutsch](i18n/de/CHANGELOG.md) | [Português (Brasil)](i18n/pt-BR/CHANGELOG.md) | [Русский](i18n/ru/CHANGELOG.md)

## Unreleased

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
