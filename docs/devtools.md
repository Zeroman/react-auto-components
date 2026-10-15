# React Auto Components DevTools

Optional development tooling for agents working on projects built with React Auto Components. Install the matching component and DevTools versions. The first release supports Vite projects; it does not inject browser control into production builds or preview servers.

## Install and enable

```sh
pnpm add -D @zeroman.yang/react-auto-components-devtools
```

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { reactAutoComponentsDevtools } from "@zeroman.yang/react-auto-components-devtools/vite";

export default defineConfig({
  plugins: [react(), reactAutoComponentsDevtools()],
});
```

Start with `RAC_AGENT=1 pnpm dev`. Without that environment variable the bridge is disabled. Alternatively set `enabled: true` in the plugin options for an explicitly dedicated agent configuration. Plugin options are server-side; never put session tokens in public environment variables.

The plugin injects the page client and writes a private discovery file under `.rac/servers/` in the Vite root. Add `.rac/` to `.gitignore`. The CLI searches the current directory and its ancestors; `--discovery-dir <path>` selects another discovery directory. The repository's root demo writes discovery to the repository root. Multiple live servers require `--server <serverId>`; no hard-coded development port is assumed. Only loopback clients and same-origin browser requests are accepted, including when the application itself is served on a LAN address.

## Agent entry point

Add this to your project's agent instructions:

> Use `pnpm exec rac inspect` to discover development pages. If multiple pages are listed, choose the intended page by title and URL. Pass its `--page` ID on every subsequent command. Use refs returned by inspect; never guess selectors. Run `pnpm exec rac help --json` for the command contract. Do not switch pages implicitly after a disconnect.

```sh
pnpm exec rac inspect
pnpm exec rac inspect --page <pageId>
pnpm exec rac click <ref> --page <pageId>
pnpm exec rac fill <ref> "new value" --page <pageId>
pnpm exec rac wait <ref> --page <pageId> --timeout 5000
pnpm exec rac goto table:local --page <pageId>
pnpm exec rac console --page <pageId>
```

Commands return JSON. An unselected inspection with multiple pages returns `selection_required` and the page list. Other commands refuse an ambiguous target. Every command addresses exactly one page, and its result includes that page ID. Opening another page never changes the target. Reload retains the page ID but replaces the connection; duplicated pages receive distinct IDs. A closed or expired page is reported offline. Commands interrupted by reload or timeout are not automatically retried: a click or submission may already have executed.

Inspection returns visible interactive elements, their accessible labels, supported actions, and component groups based on RAC's DOM semantics. Refs refer to elements in that inspection and expire after the next inspection or page reload. `fill` follows native input/change events so controlled React inputs update. `submit` uses the form's normal validation and submission; `validate` reports native HTML validity, not completion of asynchronous application validation. `wait` waits for a currently referenced element to become visible. Re-inspect to discover newly created elements. Custom widgets can be explored through their visible controls.

`AutoNavigationProvider` supplies navigation automatically in development. No application global is needed. Pages without the provider still support DOM commands; navigation commands report the missing capability. Multiple navigation providers are reported as ambiguous rather than choosing one. A successful interaction means the action executed; it does not promise all resulting data requests finished. Inspect again or wait for the relevant visible state.

## Screenshots and managed pages

For browser-owned pages and screenshots, install Playwright and its Chromium browser:

```sh
pnpm add -D playwright
pnpm exec playwright install chromium
pnpm exec rac open
pnpm exec rac shot --page <pageId> --out .rac-shots/page.png
```

`open` creates a visible browser page; use `--headless` for CI. `shot` captures the exact selected page without reloading it or rebuilding its route. Manually opened pages support inspection and actions, but require an explicitly configured `browserEndpoint` (a local Chromium CDP endpoint) for screenshots. Without a screenshot connection the command returns an actionable capability error. It never opens a substitute page. Browser capabilities are separate from RAC component capabilities.

## Options and lifecycle

- `enabled`: defaults to `process.env.RAC_AGENT === "1"`; the plugin only runs in a development server.
- `allowEval`: defaults to `false`; explicitly opt in to the `eval` command.
- `discoveryDir`: defaults to `.rac/servers` under the resolved Vite root.
- `browserEndpoint`: optional local Chromium CDP URL for an existing browser.

Page titles and URLs are refreshed when they change (with a one-second fallback for history updates). Transient polling or acknowledgment failures receive bounded retries; page actions are never replayed. Restarting the development server creates a fresh session.

The server generates a per-start token, checks it on control requests and writes it only to a permission-restricted discovery file. The served HTML contains no secret: pages load a same-origin `/__rac/bootstrap.js` module, and that module receives the token only after the loopback, Host and Origin checks pass. Even when the application is served on a LAN address, the page markup itself leaks no credential — keep the bridge's loopback restriction intact. Discovery files are removed on graceful shutdown; stale files are ignored by the CLI. Do not share them. Server shutdown also rejects pending commands and closes browsers it owns. An externally connected browser is disconnected without closing its pages.

One plugin instance serves one running dev server at a time. Attaching the same `reactAutoComponentsDevtools()` object to a second live server is rejected with `RAC-DEVTOOLS-INPUT`; create a fresh plugin instance per running server. Reusing an instance sequentially after the previous server was disposed stays supported, including Vite's restart flow.

## Maintainer release

The component library and DevTools live in one repository and initially share a version. Update both package versions and the DevTools component peer dependency together. `pnpm prepare:test-project` packs both artifacts and installs them into the consumer; it does not use workspace links for the consumer.

The release workflow verifies the tag, validates the packed consumer, and publishes the component before DevTools. The release script checks registry versions and skips an already published version so a partial release can be resumed. Prereleases use the `next` npm tag; stable releases use `latest`. Each npm package needs its own publishing authorization / Trusted Publisher configuration. Local implementation and validation do not publish either package.
