# Contributing

**English** | [简体中文](../docs/i18n/zh-CN/CONTRIBUTING.md) | [繁體中文](../docs/i18n/zh-TW/CONTRIBUTING.md) | [日本語](../docs/i18n/ja/CONTRIBUTING.md) | [한국어](../docs/i18n/ko/CONTRIBUTING.md) | [Español](../docs/i18n/es/CONTRIBUTING.md) | [Français](../docs/i18n/fr/CONTRIBUTING.md) | [Deutsch](../docs/i18n/de/CONTRIBUTING.md) | [Português (Brasil)](../docs/i18n/pt-BR/CONTRIBUTING.md) | [Русский](../docs/i18n/ru/CONTRIBUTING.md)

Use Issues to report reproducible problems or propose features, and Pull Requests to contribute improvements.

## Local development

Requires Node.js >=22.12.0 and pnpm 12.5.1. The package manager version is pinned in package.json's packageManager field.

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

The consumer project installs the library from a real tarball. After changing the library, run `pnpm prepare:test-project` again. Keep this package-based workflow instead of introducing source aliases. Do not commit artifacts, node_modules, or runtime logs.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
```

CI runs these checks on Linux. Browser tests automatically use port 4174; the development demo uses port 4173.

## Directories

- `src/components`: the seven components and their public types.
- `src/core`: configuration, providers, queries, and shared types.
- `src/adapters`: the optional XLSX adapter.
- `src/styles`: explicitly imported component styles.
- `tests`: unit tests and negative type tests.
- `test-project`: the standalone consumer project and Chromium interaction tests.
- `scripts`: packaging and consumer-project setup scripts.

## Pull Requests

Describe the problem, the resulting behavior, and the checks you actually ran. Add a regression test that reproduces the problem when fixing a component bug. Update the documentation when public APIs or usage change. Keep changes focused and avoid unrelated repository-wide formatting.

Follow the existing strict TypeScript settings and code style. React 19 remains a peer dependency, styles use a separate entry point, and XLSX stays out of the main entry. Contributions are provided under this repository's MIT license.

## Documentation translations

English documents use their default filenames. Translations are grouped by locale under `docs/i18n/<locale>/`, for example `docs/i18n/ja/README.md` and `docs/i18n/zh-CN/migration.md`. Keep the same sections, examples, technical meaning, and release status across languages. Preserve public identifiers and command arguments. When updating a document, update its translations and keep language-switch links and links to related documents consistent.
