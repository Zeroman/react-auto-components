# Standalone consumer and test project

**English** | [简体中文](../docs/i18n/zh-CN/test-project.md) | [繁體中文](../docs/i18n/zh-TW/test-project.md) | [日本語](../docs/i18n/ja/test-project.md) | [한국어](../docs/i18n/ko/test-project.md) | [Español](../docs/i18n/es/test-project.md) | [Français](../docs/i18n/fr/test-project.md) | [Deutsch](../docs/i18n/de/test-project.md) | [Português (Brasil)](../docs/i18n/pt-BR/test-project.md) | [Русский](../docs/i18n/ru/test-project.md)

This project installs the component library from a local tarball, with independent dependencies and builds. It does not use source aliases.

The demo automatically detects the browser language, with English as the fallback. Choose a language from the header or Global settings; the selection is remembered across reloads. Select Auto to follow the browser again. Ten languages are supported. Pages fill the viewport, with tables and long panels scrolling inside their own areas.

Every example page includes a **View code** button that opens its real source file in a dialog, with file tabs, one-click copy, and a GitHub link.

From the repository root, run `pnpm install --frozen-lockfile` and `pnpm prepare:test-project`, then `pnpm --dir test-project dev`.

- `pnpm --dir test-project build`: check public types and create a production build.
- `pnpm exec playwright install chromium`: install the browser on first use.
- `pnpm --dir test-project test`: run Chromium interaction tests (automatically starts a separate server on port 4174).
- After changing the library, rerun `pnpm prepare:test-project` to update the content-hashed tarball dependency.

Browser tests in `tests/components.spec.ts` cover CRUD, field validation and failed-submission retries, settings persistence, drafts and focus, nested tabs, 10,000-row scrolling, server-side pagination, expansion measurements, column widths, downloads, and mobile layouts. Screenshots go to `test-results/`.

The remaining-height demo is in the **AutoTable → Remaining height** tab. The legacy URL `http://127.0.0.1:4173/?demo=auto-height` opens the same page and selects that tab. The example can switch Flex/Grid, add/remove content above the table, show/hide the table, and change pagination and row counts. `tests/auto-height.spec.ts` measures browser boundaries and scroll-area height to verify remaining-space layout, dynamic resizing, virtualization recovery, and fixed-height compatibility.

Browser tests start a fresh Vite server on port 4174 instead of reusing the development demo on port 4173. The repackaging script notifies existing demo servers to resolve the newly installed package, avoiding stale components.

Global settings are separate from the example content and implemented in `src/GlobalSettings.tsx`. Open the panel from the sidebar or the top-right control. The current example remains mounted while changing layout, density, label width, or theme.

## Chat rendering and large histories

AutoChat includes a format picker for Markdown/GFM, code, JSON, tables, a local image, and an interactive React card. The Markdown dependencies are installed only in this private demo. The **Large history** mode exercises 1,000/10,000/50,000 variable-height messages with actual mounted-row counts, append/stream controls and history navigation.

Browser coverage lives in `tests/chat.spec.ts`, `tests/chat-renderers.spec.ts`, and `tests/chat-lab.spec.ts`.
