# AutoNavigation & Component Tree Navigation

**English** | [简体中文](i18n/zh-CN/auto-navigation.md)

React Auto Components provides a tree-structured navigation system where components themselves participate directly in the navigation tree, decoupling location, parameters, access permissions, and URL history.

---

## Two Integration Tiers

Choose the integration tier that best matches your architecture:

### Tier 1: Lightweight Router Integration (No Provider Needed)

If your application already uses an external router (such as React Router, TanStack Router, or Next.js) and simply needs `AutoMenu` or `AutoTabs` to reflect and control current URLs, use their standard controlled `value` and `onChange` props directly:

```tsx
import { AutoMenu, AutoTabs } from "@zeroman.yang/react-auto-components";
import { useLocation, useNavigate } from "react-router-dom";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Strip leading slash to match menu item id
  const currentId = location.pathname.slice(1) || "overview";

  return (
    <AutoMenu
      items={[
        { id: "overview", label: "Overview" },
        { id: "users", label: "Users" },
        { id: "settings", label: "Settings" },
      ]}
      value={currentId}
      onChange={(id) => navigate(`/${id}`)}
    />
  );
}
```

**When to use Tier 1:**

- Top-level page switching managed entirely by your external router.
- No nested component tree location discovery needed.
- No need for component-scoped `useAutoRoute` hooks, abort signals, or async lazy-mounting wait protocols.

---

### Tier 2: Component Tree Navigation (`AutoNavigation` + History Adapter)

Tier 2 turns your component hierarchy into a live, declarative navigation tree. Navigation targets are structured paths (e.g. `workspace:projects:details` or `["workspace", "projects", "details"]`), parameters are decoupled from path structure, and navigation works seamlessly inside or outside React.

```tsx
import { useEffect, useState } from "react";
import { useAutoRoute } from "@zeroman.yang/react-auto-components";

function ProjectDetails() {
  const [data, setData] = useState<unknown>(null);
  const { params, goto, signal, activeChild } = useAutoRoute({
    name: "details",
    defaultChild: "specs",
    children: ["specs", "team", "settings"],
  });

  useEffect(() => {
    if (!params.projectId) return;
    setData(null);
    // signal is automatically aborted if navigation changes or on unmount
    fetch(`/api/projects/${encodeURIComponent(params.projectId)}`, { signal })
      .then((res) => res.json())
      .then(setData)
      .catch((error) => {
        if (!signal.aborted) setData({ error: String(error) });
      });
  }, [params.projectId, signal]);

  return (
    <div>
      <h3>Project: {params.projectId}</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={() => goto("./team")}>View Team</button>
      <button onClick={() => goto("../list")}>Back to List</button>
    </div>
  );
}
```

**When to use Tier 2:**

- Deeply nested component trees requiring relative navigation (`./child`, `../sibling`).
- Decoupled parameters (`params: { projectId: "42", tab: "audit" }`).
- Asynchronous lazy component mounting where `goto` awaits child node registration before finalizing transition.
- Fine-grained permission reconciliation (`canAccess`, `roles`, `permissions`, `disabled`, `hidden`) with automatic URL correction if a target becomes forbidden or is unmounted.
- Built-in `AbortSignal` management resilient to React 18/19 StrictMode double-mounting.

---

## Official Framework Adapter Examples

To synchronize `AutoNavigation` with an external framework router (Tier 2), implement an `AutoHistoryAdapter` with `read()`, `push()`, `replace()`, and `subscribe()`.

> **Important**: The custom adapter should read the latest router location via refs to avoid stale closures, and must not rebuild synchronization listeners on every location update so pending lazy navigations are never interrupted.

Effects publish the current URL with `onChange(location, { type: "snapshot" })`, including their initial run and StrictMode replay. An unchanged snapshot does not interrupt a child's pending navigation; a changed snapshot still navigates, including a back to the previously committed route. Use `{ type: "navigation" }` for a known external navigation intent, even when its URL is unchanged. Location-only notifications keep their existing navigation semantics (with write-echo detection), so existing adapters that replay an initial snapshot should add this metadata or suppress that replay themselves.

For a deferred `void` write that is superseded, the bridge remembers its destination and corrects a late acknowledgment back to the latest intended URL. If the adapter abandons that write entirely, a later snapshot of the same destination cannot be distinguished from its acknowledgment. Publish a known external navigation as `{ type: "navigation" }` in that case; it remains authoritative.

### 1. React Router (v6 / v7)

Integrates with React Router using [useLocation](https://reactrouter.com/api/hooks/useLocation) and [useNavigate](https://reactrouter.com/api/hooks/useNavigate).

Configure your router with a splat / catch-all route (e.g. `<Route path="workspace/*" element={<App />} />`) so nested component paths are handled without unexpected 404s.

```tsx
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  decodeLocation,
  encodeLocation,
  type AutoHistoryAdapter,
  type AutoHistoryChange,
  type AutoLocation,
} from "@zeroman.yang/react-auto-components";

export function useReactRouterAdapter(basePath = ""): AutoHistoryAdapter {
  const navigate = useNavigate();
  const location = useLocation();

  const locationRef = useRef(location);
  locationRef.current = location;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const listenersRef = useRef(
    new Set<(location: AutoLocation, change?: AutoHistoryChange) => void>(),
  );

  // decodeLocation only strips basePath on a segment boundary ("/admin" never matches "/administrator").
  const readLocation = useCallback(
    (): AutoLocation =>
      decodeLocation(
        locationRef.current.pathname + locationRef.current.search,
        basePath,
      ),
    [basePath],
  );
  const toUrl = useCallback(
    (loc: AutoLocation) =>
      `/${encodeLocation(loc, basePath, "/").replace(/^\/+/, "")}`,
    [basePath],
  );

  // Notify adapter subscribers whenever the router URL changes (external / back / forward)
  useEffect(() => {
    const nextLoc = readLocation();
    listenersRef.current.forEach((fn) => fn(nextLoc, { type: "snapshot" }));
  }, [location.pathname, location.search, readLocation]);

  return useMemo<AutoHistoryAdapter>(() => {
    return {
      read(): AutoLocation {
        return readLocation();
      },
      push(loc: AutoLocation): void | Promise<void> {
        return navigateRef.current(toUrl(loc), { replace: false });
      },
      replace(loc: AutoLocation): void | Promise<void> {
        return navigateRef.current(toUrl(loc), { replace: true });
      },
      subscribe(
        listener: (location: AutoLocation, change?: AutoHistoryChange) => void,
      ): () => void {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    };
  }, [readLocation, toUrl]);
}
```

### 2. TanStack Router

Integrates with TanStack Router using [useLocation](https://tanstack.com/router/latest/docs/framework/react/api/router/useLocationHook) and [useNavigate](https://tanstack.com/router/latest/docs/framework/react/api/router/useNavigateHook).

Use a TanStack catch-all file route (e.g. `_layout/$` or `routes/workspace.$`) to capture dynamic component paths.

```tsx
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  decodeLocation,
  encodeLocation,
  type AutoHistoryAdapter,
  type AutoHistoryChange,
  type AutoLocation,
} from "@zeroman.yang/react-auto-components";

export function useTanStackRouterAdapter(basePath = ""): AutoHistoryAdapter {
  const location = useLocation();
  const navigate = useNavigate();

  const locationRef = useRef(location);
  locationRef.current = location;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const listenersRef = useRef(
    new Set<(location: AutoLocation, change?: AutoHistoryChange) => void>(),
  );

  const readLocation = useCallback((): AutoLocation => {
    const loc = locationRef.current;
    const { path } = decodeLocation(loc.pathname, basePath);
    const params: Record<string, string> = {};
    const search = new URLSearchParams(loc.searchStr);
    search.forEach((value, key) => {
      params[key] = value;
    });
    return { path, params };
  }, [basePath]);
  const toPath = useCallback(
    (loc: AutoLocation) =>
      `/${encodeLocation({ path: loc.path }, basePath, "/").replace(/^\/+/, "")}`,
    [basePath],
  );

  // Notify adapter subscribers on location change
  useEffect(() => {
    const nextLoc = readLocation();
    listenersRef.current.forEach((fn) => fn(nextLoc, { type: "snapshot" }));
  }, [location.pathname, location.searchStr, readLocation]);

  return useMemo<AutoHistoryAdapter>(
    () => ({
      read(): AutoLocation {
        return readLocation();
      },
      push(loc: AutoLocation): Promise<void> {
        return navigateRef.current({
          to: toPath(loc),
          search: loc.params ?? {},
          replace: false,
        });
      },
      replace(loc: AutoLocation): Promise<void> {
        return navigateRef.current({
          to: toPath(loc),
          search: loc.params ?? {},
          replace: true,
        });
      },
      subscribe(
        listener: (location: AutoLocation, change?: AutoHistoryChange) => void,
      ): () => void {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [readLocation, toPath],
  );
}
```

### 3. Next.js App Router ('use client')

Integrates with Next.js App Router using [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router), [usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname), and [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params).

> **Next.js Note**:
>
> 1. For statically rendered App Router routes, wrap the client component reading `useSearchParams()` in `<Suspense>`; production builds require this boundary. See the linked Next.js documentation for dynamic rendering alternatives.
> 2. Define an optional catch-all route `app/[[...slug]]/page.tsx` so multi-segment component paths resolve seamlessly without 404s.

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  type AutoHistoryAdapter,
  type AutoHistoryChange,
  type AutoLocation,
} from "@zeroman.yang/react-auto-components";

export function useNextAppRouterAdapter(): AutoHistoryAdapter {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const listenersRef = useRef(
    new Set<(location: AutoLocation, change?: AutoHistoryChange) => void>(),
  );

  const readLocation = useCallback((): AutoLocation => {
    const p = (pathnameRef.current ?? "").replace(/^\/+/, "");
    const path = p ? p.split("/").map(decodeURIComponent) : [];
    const params: Record<string, string> = {};
    if (searchParamsRef.current) {
      searchParamsRef.current.forEach((value, key) => {
        params[key] = value;
      });
    }
    return { path, params };
  }, []);

  // Reactively notify listeners on Next router navigation
  useEffect(() => {
    const nextLoc = readLocation();
    listenersRef.current.forEach((fn) => fn(nextLoc, { type: "snapshot" }));
  }, [pathname, searchParams, readLocation]);

  return useMemo<AutoHistoryAdapter>(
    () => ({
      read(): AutoLocation {
        return readLocation();
      },
      push(loc: AutoLocation): void {
        const query = loc.params
          ? new URLSearchParams(loc.params).toString()
          : "";
        const url =
          "/" +
          loc.path.map(encodeURIComponent).join("/") +
          (query ? `?${query}` : "");
        routerRef.current.push(url);
      },
      replace(loc: AutoLocation): void {
        const query = loc.params
          ? new URLSearchParams(loc.params).toString()
          : "";
        const url =
          "/" +
          loc.path.map(encodeURIComponent).join("/") +
          (query ? `?${query}` : "");
        routerRef.current.replace(url);
      },
      subscribe(
        listener: (location: AutoLocation, change?: AutoHistoryChange) => void,
      ): () => void {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [readLocation],
  );
}
```

---

## Built-in History Adapters

For standalone applications, GitHub Pages, or Node/testing environments, three built-in adapters are provided:

```tsx
import {
  createHashHistory,
  createBrowserHistory,
  createMemoryHistory,
} from "@zeroman.yang/react-auto-components";

// 1. Hash-based (ideal for GitHub Pages / static hosting):
const hashHistory = createHashHistory({ basePath: "" });

// 2. HTML5 pushState (standard SPA routing):
const browserHistory = createBrowserHistory({ basePath: "/app" });

// 3. In-memory (headless testing, SSR, Node.js):
const memoryHistory = createMemoryHistory({
  path: ["table", "local"],
  params: {},
});
memoryHistory.push({ path: ["table", "large"], params: {} });
memoryHistory.back();
```

### URL Codec

All adapters use `encodeLocation(loc, basePath, separator)` and `decodeLocation(url, basePath)`:

- Hash URLs join segments with `:` (`#/table:local`). Browser URLs join them with `/` (`/app/table/local`). Decoding accepts either separator.
- An empty path can still carry parameters: `?tab=a` and `#/?tab=a` decode to `{ path: [], params: { tab: "a" } }`.
- `basePath` matches only on a segment boundary: with `basePath: "/admin"`, `/admin/users` decodes to `["users"]`, while `/administrator` is outside this navigation and decodes as an empty location.
- Unicode paths and parameter keys/values are escaped cleanly with `encodeURIComponent`.
- Empty parameter strings (e.g. `{ query: "" }`) are preserved as `?query=` rather than dropped.
- Segments with embedded colons, slashes, or query symbols are encoded reliably.

---

## History Synchronization (`syncHistory`)

`syncHistory(navigation, adapter)` connects an `AutoNavigation` instance to an `AutoHistoryAdapter`.

- **Intermediate Path Isolation**: When navigating to a lazy-loaded child, intermediate route states trigger React mounting without writing unfinished URLs. Only committed navigations (`subscribeCommit`) write to history.
- **Echo Prevention**: Navigations initiated from external URL changes carry `source: "history"`. Their commit events are never echoed back to the adapter.
- **Transition Identity**: Rejected or forbidden external navigations reconcile to the closest valid route and call `adapter.replace()`. Older failing navigations cannot overwrite newer user navigations.
- **Initial Sync**: A non-empty URL that differs from the committed location navigates there. An empty URL receives the committed location through `adapter.replace()`. A URL that already matches is left alone, so recreating the adapter (for example `history={createHashHistory()}` written inline) never cancels a pending navigation.
- **Default Child URLs**: When a history destination resolves to a default child, the completed path replaces the incomplete URL while preserving its parameters and history entry.
- **Asynchronous Writes**: Writes run in order. A newer commit is compared with `read()` only after earlier writes finish, so returning to the original URL cannot be lost. Delayed notifications for an already observed URL do not cancel newer lazy navigation. An actual history change back to the committed route still cancels pending work.
- **Cleanup**: Returns an unsubscribe function that disconnects listeners and discards queued writes. A write already issued to an external router cannot be cancelled by the bridge.

Adapter `push`/`replace` must either update `read()` synchronously, return a promise that settles once `read()` reflects completion, or return `void` and acknowledge the deferred write through `subscribe`. Notifications must describe the location currently returned by `read()`. Rejected promises are reported through `console.error` and release the next queued write. A deferred `void` write is released when the adapter publishes a different location (for example a redirect) or after 2 seconds without acknowledgment, such as a navigation blocked by the router. If a promise resolves before `read()` reflects the new location, the later notification of that location is treated as the same write, not as a new navigation.

---

## Component Integration: AutoMenu and AutoTabs

For a custom lazy container, declare its child as `{ id: "details", awaitRegistration: true }` when ordinary entry must wait for that container to register and resolve its `defaultChild`. `AutoTabs` sets this automatically for items with nested `children`. This prevents committing a parent URL before the default child is known.

### AutoMenu

`AutoMenu` supports declarative participation in the navigation tree via the `route` prop:

```tsx
<AutoMenu
  route={{ name: "workspace", defaultChild: "projects" }}
  items={[
    {
      id: "projects",
      label: "Projects",
      content: <ProjectsView />, // Mounted when selected
    },
    {
      id: "settings",
      label: "Settings",
      children: [
        { id: "profile", label: "Profile", content: <ProfileView /> }, // path: workspace:profile
      ],
    },
    {
      id: "quick-docs",
      label: "Documentation",
      target: "workspace:docs:getting-started", // Shortcut link; calls goto() without duplicating content
    },
  ]}
/>
```

- **One route level**: A menu adds exactly one segment below its own route. Groups only organize entries, so every leaf is a direct child (`workspace:profile`, not `workspace:settings:profile`), which is why ids must be unique across the whole menu. A leaf inherits its groups' `disabled`, `hidden`, `roles`, and `permissions`.
- **Selection**: With `route`, the selected entry is the leaf whose id is the active child segment. Otherwise, inside a provider, it is the leaf whose `target` is the longest prefix of the current path.
- **`content`**: When provided on any item, `AutoMenu` wraps the layout in `.auto-menu-container` and mounts the selected item's content in `.auto-menu-content`. If no items define `content`, the traditional single-sidebar element is rendered.
- **`target`**: A shortcut target. Clicking invokes `nav.goto(target)` without mounting content under that item. Cyclic shortcut chains (e.g. `a -> b -> a`) are detected and prevented.

### AutoTabs

`AutoTabs` supports route-driven tab switching:

```tsx
<AutoTabs
  route={{ name: "tabs", defaultChild: "basic" }}
  items={[
    { id: "basic", label: "Basic", content: <BasicTab /> },
    { id: "advanced", label: "Advanced", content: <AdvancedTab /> },
  ]}
/>
```

- **Conflict Policy**: `route` and `value` are mutually exclusive. When `route` is provided, `value` should be omitted because `AutoNavigation` owns the selection. If both are supplied, `route` takes precedence and development warning `RAC-TABS-ROUTE-VALUE` is logged.
- **Nested Tabs**: Child tabs resolve relative to their parent tab route without double navigation.

---

## Core API Reference

### `createAutoNavigation(options)`

Creates an isolated navigation engine instance.

```ts
const nav = createAutoNavigation({
  initialPath: ["table", "local"],
  canAccess: (item) => true,
  readyTimeoutMs: 3000,
});
```

### `<AutoNavigationProvider>`

React context provider managing navigation lifecycle. Pass the adapter returned by any framework hook above to `history`. Configure permissions through `AutoConfigProvider.config.canAccess`; externally created navigation instances also retain their factory permission checker.

| Prop            | Type                          | Description                                                   |
| --------------- | ----------------------------- | ------------------------------------------------------------- |
| `navigation`    | `AutoNavigation`              | Optional pre-created navigation instance.                     |
| `initialPath`   | `string \| readonly string[]` | Initial path if `navigation` is omitted.                      |
| `history`       | `AutoHistoryAdapter`          | Optional adapter. Omit it to disable history synchronization. |
| `initialParams` | `Record<string, string>`      | Initial parameters if `navigation` is omitted.                |

### `useAutoRoute(config)`

Declares a component's presence in the navigation tree.

When an initial path ends at a node with an accessible `defaultChild`, registration resolves and commits that child into the actual path. History uses replacement for this normalization, so the displayed child, URL, and route signal agree without adding an entry.

`setParams` merges a parameter patch: omitted keys stay unchanged, `null` removes a key, and `""` preserves an empty value. During a pending navigation it edits the destination parameters and waits for that same navigation instead of cancelling it. Editing an incoming history destination replaces its URL when committed.

```ts
await setParams({ filter: null, query: "" });
```

```ts
const {
  nodePath, // Structural route path of this node
  activeChild, // Currently active child ID
  activeSubpath, // Path segments beyond this node
  params, // Current parameters
  signal, // AbortSignal, cancelled when params/path change or on unmount
  goto, // Navigate relative to this node
  replace, // Replace relative to this node
  setParams, // Update parameters
} = useAutoRoute({
  name: "settings",
  defaultChild: "profile",
  children: ["profile", "security"],
});
```

### `<AutoRouteScope>`

Explicit container scoping for custom layout components:

```tsx
<AutoRouteScope path={["dashboard", "analytics"]}>
  <CustomMetricsPanel />
</AutoRouteScope>
```
