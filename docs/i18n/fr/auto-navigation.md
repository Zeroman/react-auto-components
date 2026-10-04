# AutoNavigation et navigation dans l'arbre de composants

[English](../../auto-navigation.md) | [简体中文](../zh-CN/auto-navigation.md) | [繁體中文](../zh-TW/auto-navigation.md) | [日本語](../ja/auto-navigation.md) | [한국어](../ko/auto-navigation.md) | [Español](../es/auto-navigation.md) | **Français** | [Deutsch](../de/auto-navigation.md) | [Português (Brasil)](../pt-BR/auto-navigation.md) | [Русский](../ru/auto-navigation.md)

React Auto Components fournit un système de navigation arborescente où les composants participent directement à l'arbre de navigation, en découplant l'emplacement, les paramètres, les permissions d'accès et l'historique URL.

---

## Deux niveaux d'intégration

Choisissez le niveau d'intégration qui correspond le mieux à votre architecture :

### Niveau 1 : intégration légère au routeur (sans provider)

Si votre application utilise déjà un routeur externe (tel que React Router, TanStack Router ou Next.js) et qu'elle a simplement besoin que `AutoMenu` ou `AutoTabs` reflète et contrôle l'URL courante, utilisez directement leurs props contrôlées standard `value` et `onChange` :

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

**Quand utiliser le niveau 1 :**

- Le changement de pages de premier niveau est entièrement géré par votre routeur externe.
- Aucune découverte d'emplacement dans l'arbre de composants imbriqués n'est nécessaire.
- Pas besoin de hooks `useAutoRoute` à portée de composant, de signaux d'abandon ni de protocoles d'attente de montage asynchrone en différé.

---

### Niveau 2 : navigation dans l'arbre de composants (`AutoNavigation` + adaptateur d'historique)

Le niveau 2 transforme votre hiérarchie de composants en un arbre de navigation déclaratif et vivant. Les cibles de navigation sont des chemins structurés (par ex. `workspace:projects:details` ou `["workspace", "projects", "details"]`), les paramètres sont découplés de la structure du chemin, et la navigation fonctionne de façon transparente à l'intérieur comme à l'extérieur de React.

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

**Quand utiliser le niveau 2 :**

- Arbres de composants profondément imbriqués exigeant une navigation relative (`./child`, `../sibling`).
- Paramètres découplés (`params: { projectId: "42", tab: "audit" }`).
- Montage asynchrone en différé de composants où `goto` attend l'enregistrement du nœud enfant avant de finaliser la transition.
- Réconciliation fine des permissions (`canAccess`, `roles`, `permissions`, `disabled`, `hidden`) avec correction automatique de l'URL si une cible devient interdite ou est démontée.
- Gestion intégrée d'`AbortSignal`, résiliente au double montage du StrictMode de React 18/19.

---

## Exemples officiels d'adaptateurs pour frameworks

Pour synchroniser `AutoNavigation` avec un routeur de framework externe (niveau 2), implémentez un `AutoHistoryAdapter` avec `read()`, `push()`, `replace()` et `subscribe()`.

> **Important** : l'adaptateur personnalisé doit lire la dernière localisation du routeur via des refs pour éviter les closures périmées, et ne doit pas reconstruire les écouteurs de synchronisation à chaque mise à jour de la localisation, afin de ne jamais interrompre les navigations différées en attente.

Les effects publient l'URL courante avec `onChange(location, { type: "snapshot" })`, y compris leur exécution initiale et le rejeu du StrictMode. Un instantané inchangé n'interrompt pas une navigation enfant en attente ; un instantané modifié déclenche toujours la navigation, y compris un retour vers la route précédemment validée. Utilisez `{ type: "navigation" }` pour une intention de navigation externe connue, même lorsque son URL est inchangée. Les notifications de localisation seule conservent leur sémantique de navigation existante (avec détection d'écho d'écriture), donc les adaptateurs existants qui rejouent un instantané initial doivent ajouter cette métadonnée ou supprimer eux-mêmes ce rejeu.

Pour une écriture `void` différée qui est remplacée, le pont mémorise sa destination et corrige un accusé de réception tardif vers la dernière URL visée. Si l'adaptateur abandonne entièrement cette écriture, un instantané ultérieur de la même destination ne peut pas être distingué de son accusé de réception. Publiez une navigation externe connue comme `{ type: "navigation" }` dans ce cas ; elle reste déterminante.

### 1. React Router (v6 / v7)

S'intègre à React Router via [useLocation](https://reactrouter.com/api/hooks/useLocation) et [useNavigate](https://reactrouter.com/api/hooks/useNavigate).

Configurez votre routeur avec une route splat / fourre-tout (par ex. `<Route path="workspace/*" element={<App />} />`) pour que les chemins de composants imbriqués soient gérés sans 404 inattendus.

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

S'intègre à TanStack Router via [useLocation](https://tanstack.com/router/latest/docs/framework/react/api/router/useLocationHook) et [useNavigate](https://tanstack.com/router/latest/docs/framework/react/api/router/useNavigateHook).

Utilisez une route fichier fourre-tout TanStack (par ex. `_layout/$` ou `routes/workspace.$`) pour capturer les chemins dynamiques de composants.

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

S'intègre à Next.js App Router via [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router), [usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname) et [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params).

> **Note Next.js** :
>
> 1. Pour les routes App Router rendues statiquement, enveloppez dans `<Suspense>` le composant client qui lit `useSearchParams()` ; les builds de production exigent cette frontière. Consultez la documentation Next.js liée pour des alternatives de rendu dynamique.
> 2. Définissez une route fourre-tout optionnelle `app/[[...slug]]/page.tsx` pour que les chemins de composants multi-segments se résolvent sans 404.

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

## Adaptateurs d'historique intégrés

Pour les applications autonomes, GitHub Pages ou les environnements Node/de test, trois adaptateurs intégrés sont fournis :

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

### Codec URL

Tous les adaptateurs utilisent `encodeLocation(loc, basePath, separator)` et `decodeLocation(url, basePath)` :

- Les URL de hash joignent les segments avec `:` (`#/table:local`). Les URL de navigateur les joignent avec `/` (`/app/table/local`). Le décodage accepte l'un ou l'autre séparateur.
- Un chemin vide peut quand même porter des paramètres : `?tab=a` et `#/?tab=a` décodent en `{ path: [], params: { tab: "a" } }`.
- `basePath` ne correspond que sur une frontière de segment : avec `basePath: "/admin"`, `/admin/users` décode en `["users"]`, tandis que `/administrator` est hors de cette navigation et décode comme une localisation vide.
- Les chemins Unicode ainsi que les clés et valeurs de paramètres sont échappés proprement avec `encodeURIComponent`.
- Les chaînes de paramètres vides (par ex. `{ query: "" }`) sont conservées comme `?query=` plutôt que supprimées.
- Les segments contenant des deux-points, des barres obliques ou des symboles de requête sont encodés de façon fiable.

---

## Synchronisation de l'historique (`syncHistory`)

`syncHistory(navigation, adapter)` connecte une instance `AutoNavigation` à un `AutoHistoryAdapter`.

- **Isolation des chemins intermédiaires** : lors d'une navigation vers un enfant chargé en différé, les états de route intermédiaires déclenchent le montage React sans écrire d'URL inachevées. Seules les navigations validées (`subscribeCommit`) écrivent dans l'historique.
- **Prévention des échos** : les navigations initiées par des changements d'URL externes portent `source: "history"`. Leurs évènements de validation ne sont jamais renvoyés en écho à l'adaptateur.
- **Identité de transition** : les navigations externes rejetées ou interdites se réconcilient vers la route valide la plus proche et appellent `adapter.replace()`. Les navigations plus anciennes en échec ne peuvent pas écraser des navigations utilisateur plus récentes.
- **Synchronisation initiale** : une URL non vide qui diffère de la localisation validée y navigue. Une URL vide reçoit la localisation validée via `adapter.replace()`. Une URL déjà identique est laissée telle quelle, donc recréer l'adaptateur (par exemple `history={createHashHistory()}` écrit inline) n'annule jamais une navigation en attente.
- **URL d'enfant par défaut** : quand une destination d'historique se résout vers un enfant par défaut, le chemin complété remplace l'URL incomplète tout en préservant ses paramètres et son entrée d'historique.
- **Écritures asynchrones** : les écritures s'exécutent dans l'ordre. Une validation plus récente n'est comparée à `read()` qu'après la fin des écritures antérieures, donc un retour vers l'URL d'origine ne peut pas être perdu. Les notifications retardées d'une URL déjà observée n'annulent pas une navigation différée plus récente. Un véritable changement d'historique revenant à la route validée annule toujours le travail en attente.
- **Nettoyage** : renvoie une fonction de désabonnement qui débranche les écouteurs et abandonne les écritures en attente. Une écriture déjà émise vers un routeur externe ne peut pas être annulée par le pont.

Les `push`/`replace` de l'adaptateur doivent soit mettre à jour `read()` de façon synchrone, soit renvoyer une promesse qui se règle une fois que `read()` reflète l'achèvement, soit renvoyer `void` et accuser réception de l'écriture différée via `subscribe`. Les notifications doivent décrire la localisation actuellement renvoyée par `read()`. Les promesses rejetées sont signalées via `console.error` et libèrent la prochaine écriture en file. Une écriture `void` différée est libérée quand l'adaptateur publie une localisation différente (par exemple une redirection) ou après 2 secondes sans accusé de réception, par exemple une navigation bloquée par le routeur. Si une promesse se résout avant que `read()` ne reflète la nouvelle localisation, la notification ultérieure de cette localisation est traitée comme la même écriture, pas comme une nouvelle navigation.

---

## Intégration des composants : AutoMenu et AutoTabs

Pour un conteneur en différé personnalisé, déclarez son enfant comme `{ id: "details", awaitRegistration: true }` lorsque l'entrée ordinaire doit attendre que ce conteneur s'enregistre et résolve son `defaultChild`. `AutoTabs` le définit automatiquement pour les éléments ayant des `children` imbriqués. Cela évite de valider une URL parent avant que l'enfant par défaut soit connu.

### AutoMenu

`AutoMenu` prend en charge la participation déclarative à l'arbre de navigation via la prop `route` :

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

- **Un seul niveau de route** : un menu ajoute exactement un segment sous sa propre route. Les groupes ne font qu'organiser les entrées, donc chaque feuille est un enfant direct (`workspace:profile`, pas `workspace:settings:profile`), d'où l'exigence d'ids uniques dans tout le menu. Une feuille hérite du `disabled`, `hidden`, `roles` et `permissions` de ses groupes.
- **Sélection** : avec `route`, l'entrée sélectionnée est la feuille dont l'id est le segment enfant actif. Sinon, à l'intérieur d'un provider, c'est la feuille dont le `target` est le préfixe le plus long du chemin courant.
- **`content`** : lorsqu'il est fourni sur un élément, `AutoMenu` enveloppe la disposition dans `.auto-menu-container` et monte le contenu de l'élément sélectionné dans `.auto-menu-content`. Si aucun élément ne définit `content`, l'élément traditionnel à barre latérale unique est rendu.
- **`target`** : une cible de raccourci. Le clic appelle `nav.goto(target)` sans monter de contenu sous cet élément. Les chaînes de raccourcis cycliques (par ex. `a -> b -> a`) sont détectées et empêchées.

### AutoTabs

`AutoTabs` prend en charge le changement d'onglets piloté par la route :

```tsx
<AutoTabs
  route={{ name: "tabs", defaultChild: "basic" }}
  items={[
    { id: "basic", label: "Basic", content: <BasicTab /> },
    { id: "advanced", label: "Advanced", content: <AdvancedTab /> },
  ]}
/>
```

- **Politique de conflit** : `route` et `value` sont mutuellement exclusifs. Quand `route` est fourni, `value` doit être omis car `AutoNavigation` est propriétaire de la sélection. Si les deux sont fournis, `route` prime et l'avertissement de développement `RAC-TABS-ROUTE-VALUE` est journalisé.
- **Onglets imbriqués** : les onglets enfants se résolvent relativement à la route de leur onglet parent sans double navigation.

---

## Référence de l'API principale

### `createAutoNavigation(options)`

Crée une instance isolée du moteur de navigation.

```ts
const nav = createAutoNavigation({
  initialPath: ["table", "local"],
  canAccess: (item) => true,
  readyTimeoutMs: 3000,
});
```

### `<AutoNavigationProvider>`

Provider de contexte React gérant le cycle de vie de la navigation. Passez à `history` l'adaptateur renvoyé par n'importe quel hook de framework ci-dessus. Configurez les permissions via `AutoConfigProvider.config.canAccess` ; les instances de navigation créées extérieurement conservent aussi leur vérificateur de permissions d'usine.

| Prop            | Type                          | Description                                                                                 |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| `navigation`    | `AutoNavigation`              | Instance de navigation pré-créée, optionnelle.                                               |
| `initialPath`   | `string \| readonly string[]` | Chemin initial si `navigation` est omis.                                                     |
| `history`       | `AutoHistoryAdapter`          | Adaptateur optionnel. Omettez-le pour désactiver la synchronisation de l'historique.         |
| `initialParams` | `Record<string, string>`      | Paramètres initiaux si `navigation` est omis.                                                |
| `hashSync`      | `boolean`                     | Raccourci déprécié d'adaptateur de hash, défaut `false`. Préférez `history={createHashHistory()}`. |

### `useAutoRoute(config)`

Déclare la présence d'un composant dans l'arbre de navigation.

Quand un chemin initial s'arrête sur un nœud doté d'un `defaultChild` accessible, l'enregistrement se résout et valide cet enfant dans le chemin réel. L'historique utilise le remplacement pour cette normalisation, afin que l'enfant affiché, l'URL et le signal de route concordent sans ajouter d'entrée.

`setParams` fusionne un correctif de paramètres : les clés omises restent inchangées, `null` supprime une clé, et `""` préserve une valeur vide. Pendant une navigation en attente, il édite les paramètres de destination et attend cette même navigation au lieu de l'annuler. L'édition d'une destination d'historique entrante remplace son URL lors de la validation.

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

Conteneur de portée explicite pour les composants de disposition personnalisés :

```tsx
<AutoRouteScope path={["dashboard", "analytics"]}>
  <CustomMetricsPanel />
</AutoRouteScope>
```
