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

## Watch form and search data change the UI

In this repository, start `pnpm dev:agent`, open the printed local URL, and select **RAC live demo** under AutoForm or AutoSearch. These examples also work with manual input. RAC operates their real controls and triggers the normal React change handlers.

Click **Start demonstration** for a guided run. The development server inspects fresh controls and sends real RAC `fill` / `click` commands through the same channel as the CLI. Each step shows a hint and highlights what to watch, waits about three seconds before changing data, then holds the result for at least three seconds. Physical page interaction is temporarily blocked; **Stop** and Esc remain available. Completion, cancellation or a connection error releases the lock. A command already in flight may finish while stopping; no subsequent step runs.

The run is bound to this page and connection. Other open pages are untouched; a reload, route change or disconnect ends the run without automatic retries. Only named scenarios declared in the Vite plugin’s optional `demos` configuration may run; the UI cannot submit executable code or arbitrary command steps. The repository definitions live in `test-project/racDemoScenarios.ts`. All demo requests use the existing local-origin and discovery-token gates. Ordinary development, static builds and preview do not enable this feature.

```sh
pnpm rac inspect
# Select the intended page by title and URL; replace every placeholder below.
pnpm rac goto form:rac --page <pageId>
pnpm rac inspect --page <pageId>
pnpm rac fill <project-name-ref> "Nebula" --page <pageId>
pnpm rac fill <project-budget-ref> "4800" --page <pageId>
pnpm rac fill <enabled-ref> true --page <pageId>
# A new field appears. Inspect again and use the NEW refs from now on.
pnpm rac inspect --page <pageId>
pnpm rac fill <internal-code-ref> "RAC-001" --page <pageId>
```

Watch the **Live preview** card and **Current value** update together. Enabling reveals the internal code field; Reset restores Atlas, budget 1200 and the disabled state. A controlled `AutoForm` passes each change to the demo's state setter, and the same state renders the preview. No submit is needed to see the changes.

```sh
pnpm rac goto search:rac --page <pageId>
pnpm rac inspect --page <pageId>
pnpm rac fill <project-name-ref> "Atlas" --page <pageId>
```

In **Instant** mode the count changes from six to two, showing Atlas and Atlas Mobile. Reset restores all six. For **Manual** mode, inspect again, fill the Search mode select with `manual`, then change the project name. The criteria draft changes while the applied criteria and results stay unchanged. Click the Search button using a current ref to apply the draft. For the status filter, use the `options[].value` returned by inspect for Active or Paused; the DOM option value is an index, not the model's `active` / `paused` string.

Refs above are placeholders, never fixed IDs. Find controls by their accessible names and supported actions within the intended component. Every new inspect expires all previous refs; after navigation or a field appears, inspect again. If multiple servers exist, add `--server <serverId>` too. `fill` changes field values through events; it does not directly replace an arbitrary component data object. Search results update after validation and `onSearch`, so verify the visible result after each action. Use `rac shot` on a managed page to capture the live preview and result list.

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

Result delivery is bounded: the client returns `RAC-DEVTOOLS-RESULT` instead of disconnecting when a successful result exceeds 512 KiB in UTF-8. The action already ran and is never replayed. Error details and console records are truncated to bounded sizes. The result endpoint accepts at most 2 MiB; command inputs retain their 64 KiB limit.
