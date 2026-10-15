# AGENTS.md

Rules for AI agents working in this repository. Human conventions live in
CONTRIBUTING and `llms.txt` (the component contract index).

## i18n policy — single source of truth: `locales.config.json`

**Maintained languages: English (source) + 简体中文 (zh-CN). All other locales
are PAUSED and FROZEN.**

- English docs are the source: repo `README.md` + `docs/*.md`. Chinese mirrors
  live in `docs/i18n/zh-CN/`.
- When adding or changing docs, error codes, or demo UI strings, update
  **en + zh-CN only**.
- Never edit files under `docs/i18n/<paused-locale>/`. They are hash-frozen by
  `locales.snapshot.json` and enforced by `tests/i18n-policy.test.ts` — if you
  touch them, that test fails and tells you to revert. That failure is the
  policy working as intended.
- Paused-locale files may legally be missing or stale; `scripts/check-docs-i18n.mjs`
  only validates active locales (deleting an ACTIVE translation still fails).
- In `test-project/src/*.ts` message dictionaries (mixed-locale files), only
  fill the `en` and `zh-CN` catalogs. Other catalogs degrade gracefully to
  English at runtime via `translateMessage` fallback — do not maintain them.
- To resume a locale later: move it from `paused` to `active` in
  `locales.config.json`, refresh its translations, then regenerate the freeze:
  `node scripts/snapshot-paused-i18n.mjs`.

## Verification before finishing any change

- `pnpm typecheck && pnpm test` (root; includes i18n policy and docs drift tests)
- `pnpm check:docs` (docs i18n drift, active locales only)
- `pnpm --dir test-project exec tsc --noEmit` when test-project files changed
- E2E: `pnpm test:e2e --project=chromium` (full browser matrix runs on tags)

## Other invariants

- Developer-facing errors use RacError codes (`RAC-…`) with a Fix line; the
  text is a locked contract in `tests/contracts.test.tsx` and `docs/errors.md`.
- `test-project` consumes the library via a packed tarball; run
  `pnpm prepare:test-project` after changing library `src/`.
- Agent browser tooling: `packages/devtools` publishes as
  `@zeroman.yang/react-auto-components-devtools`. Start with `pnpm dev:agent`,
  then run `pnpm rac inspect` and `pnpm rac help --json`. With multiple pages,
  choose by title/URL and pass `--page <pageId>` on every operation. Re-inspect
  after reload; never switch pages or retry mutations implicitly.
- `/__rac/*` endpoints require the server's discovery token. `.rac/` is private
  and ignored. Ordinary dev, production builds and preview do not enable control.
- Keep component and DevTools versions synchronized; test-project consumes both
  packages as tarballs via `pnpm prepare:test-project`.
