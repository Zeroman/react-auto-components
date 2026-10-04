# AutoNavigation und die Navigation im Komponentenbaum

[English](../../auto-navigation.md) | [简体中文](../zh-CN/auto-navigation.md) | [繁體中文](../zh-TW/auto-navigation.md) | [日本語](../ja/auto-navigation.md) | [한국어](../ko/auto-navigation.md) | [Español](../es/auto-navigation.md) | [Français](../fr/auto-navigation.md) | **Deutsch** | [Português (Brasil)](../pt-BR/auto-navigation.md) | [Русский](../ru/auto-navigation.md)

React Auto Components bietet ein baumstrukturiertes Navigationssystem, bei dem die Komponenten selbst direkt am Navigationsbaum teilnehmen und Position, Parameter, Zugriffsrechte sowie URL-Verlauf entkoppelt werden.

---

## Zwei Integrationsstufen

Wählen Sie die Integrationsstufe, die am besten zu Ihrer Architektur passt:

### Stufe 1: Leichtgewichtige Router-Integration (ohne Provider)

Wenn Ihre Anwendung bereits einen externen Router verwendet (etwa React Router, TanStack Router oder Next.js) und `AutoMenu` oder `AutoTabs` lediglich die aktuelle URL abbilden und steuern sollen, verwenden Sie direkt deren übliche kontrollierte Props `value` und `onChange`:

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

**Wann Stufe 1 geeignet ist:**

- Das Umschalten der Seiten der obersten Ebene wird vollständig von Ihrem externen Router verwaltet.
- Es ist keine Ermittlung der Position innerhalb des Komponentenbaums nötig.
- Es werden keine komponentenbezogenen `useAutoRoute`-Hooks, Abbruchsignale oder asynchrone Warteprotokolle für das lazy Mounting benötigt.

---

### Stufe 2: Navigation im Komponentenbaum (`AutoNavigation` + History-Adapter)

Stufe 2 macht aus Ihrer Komponentenhierarchie einen lebendigen, deklarativen Navigationsbaum. Navigationsziele sind strukturierte Pfade (z. B. `workspace:projects:details` oder `["workspace", "projects", "details"]`), Parameter sind von der Pfadstruktur entkoppelt, und die Navigation funktioniert nahtlos innerhalb und außerhalb von React.

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

**Wann Stufe 2 geeignet ist:**

- Tief verschachtelte Komponentenbäume, die relative Navigation erfordern (`./child`, `../sibling`).
- Entkoppelte Parameter (`params: { projectId: "42", tab: "audit" }`).
- Asynchrones lazy Mounten von Komponenten, bei dem `goto` auf die Registrierung des Kindknotens wartet, bevor der Übergang abgeschlossen wird.
- Feingranulare Berechtigungsabstimmung (`canAccess`, `roles`, `permissions`, `disabled`, `hidden`) mit automatischer URL-Korrektur, falls ein Ziel unzulässig wird oder ausgehängt ist.
- Eingebautes `AbortSignal`-Management, robust gegenüber dem Doppelt-Mounten im StrictMode von React 18/19.

---

## Offizielle Beispiele für Framework-Adapter

Um `AutoNavigation` mit einem externen Framework-Router zu synchronisieren (Stufe 2), implementieren Sie einen `AutoHistoryAdapter` mit `read()`, `push()`, `replace()` und `subscribe()`.

> **Wichtig**: Der benutzerdefinierte Adapter sollte die aktuellste Router-Position über Refs lesen, um veraltete Closures zu vermeiden, und darf die Synchronisierungs-Listener bei jeder Positionsaktualisierung nicht neu aufbauen, damit anstehende lazy Navigationen niemals unterbrochen werden.

Effects veröffentlichen die aktuelle URL mit `onChange(location, { type: "snapshot" })`, einschließlich ihres ersten Durchlaufs und der StrictMode-Wiederholung. Ein unveränderter Snapshot unterbricht keine anstehende Navigation eines Kindes; ein veränderter Snapshot navigiert weiterhin, auch zurück zur zuvor committeten Route. Verwenden Sie `{ type: "navigation" }` für eine bekannte externe Navigationsabsicht, selbst wenn sich deren URL nicht geändert hat. Reine Positionsbenachrichtigungen behalten ihre bestehende Navigationssemantik (mit Schreib-Echo-Erkennung); bestehende Adapter, die einen anfänglichen Snapshot wiederholen, sollten diese Metadaten ergänzen oder diese Wiederholung selbst unterdrücken.

Bei einem aufgeschobenen `void`-Schreibvorgang, der verdrängt wurde, merkt sich die Brücke sein Ziel und korrigiert eine verspätete Bestätigung zurück auf die zuletzt beabsichtigte URL. Gibt der Adapter diesen Schreibvorgang vollständig auf, kann ein späterer Snapshot desselben Ziels nicht von seiner Bestätigung unterschieden werden. Veröffentlichen Sie eine bekannte externe Navigation in diesem Fall als `{ type: "navigation" }`; sie bleibt maßgeblich.

### 1. React Router (v6 / v7)

Integriert React Router über [useLocation](https://reactrouter.com/api/hooks/useLocation) und [useNavigate](https://reactrouter.com/api/hooks/useNavigate).

Konfigurieren Sie Ihren Router mit einer Splat-/Catch-all-Route (z. B. `<Route path="workspace/*" element={<App />} />`), damit verschachtelte Komponentenpfade ohne unerwartete 404-Fehler verarbeitet werden.

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

Integriert TanStack Router über [useLocation](https://tanstack.com/router/latest/docs/framework/react/api/router/useLocationHook) und [useNavigate](https://tanstack.com/router/latest/docs/framework/react/api/router/useNavigateHook).

Verwenden Sie eine TanStack-Catch-all-Dateiroute (z. B. `_layout/$` oder `routes/workspace.$`), um dynamische Komponentenpfade einzufangen.

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

Integriert den Next.js App Router über [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router), [usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname) und [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params).

> **Next.js-Hinweis**:
>
> 1. Wickeln Sie bei statisch gerenderten App-Router-Routen die Client-Komponente, die `useSearchParams()` liest, in `<Suspense>` ein; Produktions-Builds verlangen diese Grenze. Alternativen über dynamisches Rendering finden Sie in der verlinkten Next.js-Dokumentation.
> 2. Definieren Sie eine optionale Catch-all-Route `app/[[...slug]]/page.tsx`, damit mehrsegmentige Komponentenpfade nahtlos und ohne 404-Fehler auflösen.

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

## Eingebaute History-Adapter

Für eigenständige Anwendungen, GitHub Pages oder Node-/Testumgebungen werden drei eingebaute Adapter bereitgestellt:

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

### URL-Codec

Alle Adapter verwenden `encodeLocation(loc, basePath, separator)` und `decodeLocation(url, basePath)`:

- Hash-URLs verbinden Segmente mit `:` (`#/table:local`). Browser-URLs verbinden sie mit `/` (`/app/table/local`). Beim Dekodieren werden beide Trennzeichen akzeptiert.
- Ein leerer Pfad kann weiterhin Parameter tragen: `?tab=a` und `#/?tab=a` dekodieren zu `{ path: [], params: { tab: "a" } }`.
- `basePath` stimmt nur an einer Segmentgrenze überein: Mit `basePath: "/admin"` dekodiert `/admin/users` zu `["users"]`, während `/administrator` außerhalb dieser Navigation liegt und als leere Position dekodiert wird.
- Unicode-Pfade sowie Parameter-Schlüssel und -Werte werden sauber mit `encodeURIComponent` maskiert.
- Leere Parameterzeichenfolgen (z. B. `{ query: "" }`) bleiben als `?query=` erhalten, statt verworfen zu werden.
- Segmente mit eingebetteten Doppelpunkten, Schrägstrichen oder Fragezeichen werden zuverlässig kodiert.

---

## History-Synchronisierung (`syncHistory`)

`syncHistory(navigation, adapter)` verbindet eine `AutoNavigation`-Instanz mit einem `AutoHistoryAdapter`.

- **Isolation der Zwischenpfade**: Beim Navigieren zu einem lazy geladenen Kind lösen Zwischenzustände der Route nur das Mounten in React aus, ohne unvollständige URLs zu schreiben. Nur committete Navigationen (`subscribeCommit`) schreiben in den Verlauf.
- **Echo-Vermeidung**: Navigationen, die von externen URL-Änderungen ausgehen, tragen `source: "history"`. Ihre Commit-Ereignisse werden niemals zurück an den Adapter gespiegelt.
- **Übergangsidentität**: Abgelehnte oder unzulässige externe Navigationen gleichen sich auf die nächstgelegene gültige Route ab und rufen `adapter.replace()` auf. Ältere gescheiterte Navigationen können neuere Benutzernavigationen nicht überschreiben.
- **Erstsynchronisierung**: Eine nicht leere URL, die von der committeten Position abweicht, navigiert dorthin. Eine leere URL erhält die committete Position durch `adapter.replace()`. Eine bereits übereinstimmende URL bleibt unangetastet, sodass das Neuerstellen des Adapters (z. B. `history={createHashHistory()}` inline geschrieben) nie eine anstehende Navigation abbricht.
- **Standard-Kind-URLs**: Löst ein Verlaufsziel auf ein Standard-Kind auf, ersetzt der vollständige Pfad die unvollständige URL, wobei deren Parameter und Verlaufseintrag erhalten bleiben.
- **Asynchrone Schreibvorgänge**: Schreibvorgänge laufen der Reihe nach. Ein neuerer Commit wird erst mit `read()` verglichen, nachdem frühere Schreibvorgänge abgeschlossen sind, sodass eine Rückkehr zur ursprünglichen URL nicht verloren gehen kann. Verspätete Benachrichtigungen über eine bereits beobachtete URL brechen keine neuere lazy Navigation ab. Eine tatsächliche Verlaufsänderung zurück zur committeten Route bricht anstehende Arbeiten jedoch ab.
- **Aufräumen**: Gibt eine Abmeldefunktion zurück, die Listener trennt und wartende Schreibvorgänge verwirft. Ein bereits an einen externen Router übergebener Schreibvorgang kann von der Brücke nicht mehr abgebrochen werden.

Adapter-`push`/`replace` müssen entweder `read()` synchron aktualisieren, ein Promise zurückgeben, das erst abschließt, wenn `read()` den Abschluss widerspiegelt, oder `void` zurückgeben und den aufgeschobenen Schreibvorgang über `subscribe` bestätigen. Benachrichtigungen müssen die Position beschreiben, die `read()` aktuell zurückgibt. Abgelehnte Promises werden über `console.error` gemeldet und geben den nächsten wartenden Schreibvorgang frei. Ein aufgeschobener `void`-Schreibvorgang wird freigegeben, wenn der Adapter eine andere Position veröffentlicht (z. B. eine Umleitung) oder nach 2 Sekunden ohne Bestätigung, etwa bei einer vom Router blockierten Navigation. Löst ein Promise schon auf, bevor `read()` die neue Position widerspiegelt, gilt die spätere Benachrichtigung über diese Position als derselbe Schreibvorgang, nicht als neue Navigation.

---

## Komponenten-Integration: AutoMenu und AutoTabs

Deklarieren Sie für einen benutzerdefinierten lazy Container sein Kind als `{ id: "details", awaitRegistration: true }`, wenn ein gewöhnlicher Eintritt warten soll, bis dieser Container registriert ist und sein `defaultChild` aufgelöst hat. `AutoTabs` setzt dies automatisch für Einträge mit verschachtelten `children`. So wird verhindert, dass eine Eltern-URL committet wird, bevor das Standard-Kind bekannt ist.

### AutoMenu

`AutoMenu` unterstützt die deklarative Teilnahme am Navigationsbaum über die `route`-Prop:

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

- **Genau eine Route-Ebene**: Ein Menü fügt unter seiner eigenen Route genau ein Segment hinzu. Gruppen organisieren lediglich die Einträge, sodass jedes Blatt ein direktes Kind ist (`workspace:profile`, nicht `workspace:settings:profile`) — deshalb müssen ids im gesamten Menü eindeutig sein. Ein Blatt erbt `disabled`, `hidden`, `roles` und `permissions` seiner Gruppen.
- **Auswahl**: Mit `route` ist der gewählte Eintrag das Blatt, dessen id dem aktiven Kind-Segment entspricht. Andernfalls ist es innerhalb eines Providers das Blatt, dessen `target` der längste Präfix des aktuellen Pfads ist.
- **`content`**: Sobald ein Eintrag `content` angibt, umschließt `AutoMenu` das Layout mit `.auto-menu-container` und hängt den Inhalt des gewählten Eintrags in `.auto-menu-content` ein. Definieren keine Einträge `content`, wird das klassische Element mit einzelner Seitenleiste gerendert.
- **`target`**: Ein Verknüpfungsziel. Ein Klick ruft `nav.goto(target)` auf, ohne unter diesem Eintrag Inhalt zu mounten. Zirkuläre Verkettungen (z. B. `a -> b -> a`) werden erkannt und verhindert.

### AutoTabs

`AutoTabs` unterstützt routengesteuertes Umschalten der Reiter:

```tsx
<AutoTabs
  route={{ name: "tabs", defaultChild: "basic" }}
  items={[
    { id: "basic", label: "Basic", content: <BasicTab /> },
    { id: "advanced", label: "Advanced", content: <AdvancedTab /> },
  ]}
/>
```

- **Konfliktregel**: `route` und `value` schließen einander aus. Ist `route` angegeben, sollte `value` weggelassen werden, weil `AutoNavigation` die Auswahl besitzt. Werden beide übergeben, gewinnt `route`, und im Entwicklungsmodus wird die Warnung `RAC-TABS-ROUTE-VALUE` ausgegeben.
- **Verschachtelte Reiter**: Kind-Reiter werden relativ zur Route ihres Eltern-Reiters aufgelöst, ohne doppelte Navigation.

---

## Kern-API-Referenz

### `createAutoNavigation(options)`

Erzeugt eine isolierte Instanz der Navigations-Engine.

```ts
const nav = createAutoNavigation({
  initialPath: ["table", "local"],
  canAccess: (item) => true,
  readyTimeoutMs: 3000,
});
```

### `<AutoNavigationProvider>`

React-Context-Provider, der den Lebenszyklus der Navigation verwaltet. Übergeben Sie den von einem der obigen Framework-Hooks zurückgegebenen Adapter an `history`. Konfigurieren Sie Berechtigungen über `AutoConfigProvider.config.canAccess`; extern erstellte Navigationsinstanzen behalten zusätzlich ihren Berechtigungsprüfer aus der Fabrik bei.

| Prop            | Typ                          | Beschreibung                                                                                |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| `navigation`    | `AutoNavigation`              | Optionale, vorab erstellte Navigationsinstanz.                                               |
| `initialPath`   | `string \| readonly string[]` | Initialer Pfad, falls `navigation` weggelassen wird.                                         |
| `history`       | `AutoHistoryAdapter`          | Optionaler Adapter. Lassen Sie ihn weg, um die History-Synchronisierung zu deaktivieren.     |
| `initialParams` | `Record<string, string>`      | Initiale Parameter, falls `navigation` weggelassen wird.                                     |
| `hashSync`      | `boolean`                     | Veraltete Abkürzung für den Hash-Adapter, Standard `false`. Bevorzugen Sie `history={createHashHistory()}`. |

### `useAutoRoute(config)`

Deklariert die Anwesenheit einer Komponente im Navigationsbaum.

Endet ein initialer Pfad an einem Knoten mit einem zugänglichen `defaultChild`, löst die Registrierung auf und committet dieses Kind in den tatsächlichen Pfad. Die History nutzt für diese Normalisierung das Ersetzen, sodass angezeigtes Kind, URL und Route-Signal übereinstimmen, ohne einen Eintrag hinzuzufügen.

`setParams` führt einen Parameter-Patch zusammen: Weggelassene Schlüssel bleiben unverändert, `null` entfernt einen Schlüssel, und `""` erhält einen leeren Wert. Während einer anstehenden Navigation bearbeitet es die Zielparameter und wartet auf ebendiese Navigation, statt sie abzubrechen. Das Bearbeiten eines eingehenden History-Ziels ersetzt dessen URL beim Commit.

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

Explizite Container-Begrenzung für benutzerdefinierte Layout-Komponenten:

```tsx
<AutoRouteScope path={["dashboard", "analytics"]}>
  <CustomMetricsPanel />
</AutoRouteScope>
```
