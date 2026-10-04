# AutoNavigation y navegación por árbol de componentes

[English](../../auto-navigation.md) | [简体中文](../zh-CN/auto-navigation.md) | [繁體中文](../zh-TW/auto-navigation.md) | [日本語](../ja/auto-navigation.md) | [한국어](../ko/auto-navigation.md) | **Español** | [Français](../fr/auto-navigation.md) | [Deutsch](../de/auto-navigation.md) | [Português (Brasil)](../pt-BR/auto-navigation.md) | [Русский](../ru/auto-navigation.md)

React Auto Components proporciona un sistema de navegación con estructura de árbol en el que los propios componentes participan directamente en el árbol de navegación, desacoplando ubicación, parámetros, permisos de acceso e historial de URL.

---

## Dos niveles de integración

Elige el nivel de integración que mejor se ajuste a tu arquitectura:

### Nivel 1: integración ligera con el router (sin Provider)

Si tu aplicación ya utiliza un router externo (como React Router, TanStack Router o Next.js) y solo necesitas que `AutoMenu` o `AutoTabs` reflejen y controlen las URL actuales, usa directamente sus props controladas estándar `value` y `onChange`:

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

**Cuándo usar el nivel 1:**

- El cambio de páginas de nivel superior está gestionado por completo por tu router externo.
- No se necesita descubrir la ubicación dentro de un árbol de componentes anidado.
- No necesitas hooks `useAutoRoute` con ámbito de componente, señales de aborto ni protocolos de espera asíncrona para montaje diferido.

---

### Nivel 2: navegación por árbol de componentes (`AutoNavigation` + adaptador de historial)

El nivel 2 convierte tu jerarquía de componentes en un árbol de navegación vivo y declarativo. Los destinos de navegación son rutas estructuradas (p. ej. `workspace:projects:details` o `["workspace", "projects", "details"]`), los parámetros están desacoplados de la estructura de la ruta, y la navegación funciona sin problemas dentro o fuera de React.

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

**Cuándo usar el nivel 2:**

- Árboles de componentes profundamente anidados que requieren navegación relativa (`./child`, `../sibling`).
- Parámetros desacoplados (`params: { projectId: "42", tab: "audit" }`).
- Montaje asíncrono de componentes diferidos donde `goto` espera el registro del nodo hijo antes de finalizar la transición.
- Reconciliación de permisos granular (`canAccess`, `roles`, `permissions`, `disabled`, `hidden`) con corrección automática de la URL si un destino se vuelve prohibido o se desmonta.
- Gestión integrada de `AbortSignal` resistente al doble montaje de StrictMode en React 18/19.

---

## Ejemplos oficiales de adaptadores para frameworks

Para sincronizar `AutoNavigation` con el router de un framework externo (nivel 2), implementa un `AutoHistoryAdapter` con `read()`, `push()`, `replace()` y `subscribe()`.

> **Importante**: el adaptador personalizado debe leer la última ubicación del router mediante refs para evitar cierres obsoletos (stale closures), y no debe reconstruir los listeners de sincronización en cada actualización de ubicación, de modo que las navegaciones diferidas pendientes nunca se interrumpan.

Los efectos publican la URL actual con `onChange(location, { type: "snapshot" })`, incluida su ejecución inicial y la repetición de StrictMode. Una instantánea sin cambios no interrumpe una navegación pendiente de un hijo; una instantánea con cambios sí navega, incluso al volver a la ruta previamente confirmada. Usa `{ type: "navigation" }` para una intención de navegación externa conocida, incluso cuando su URL no cambia. Las notificaciones que solo informan la ubicación conservan su semántica de navegación existente (con detección de eco de escritura), por lo que los adaptadores existentes que repiten una instantánea inicial deben añadir estos metadatos o suprimir esa repetición por sí mismos.

Para una escritura `void` diferida que queda sustituida, el puente recuerda su destino y corrige una confirmación tardía de vuelta a la última URL prevista. Si el adaptador abandona esa escritura por completo, una instantánea posterior del mismo destino no puede distinguirse de su confirmación. En ese caso, publica una navegación externa conocida como `{ type: "navigation" }`; sigue siendo autoritativa.

### 1. React Router (v6 / v7)

Se integra con React Router mediante [useLocation](https://reactrouter.com/api/hooks/useLocation) y [useNavigate](https://reactrouter.com/api/hooks/useNavigate).

Configura tu router con una ruta splat / catch-all (p. ej. `<Route path="workspace/*" element={<App />} />`) para que las rutas anidadas de componentes se gestionen sin errores 404 inesperados.

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

Se integra con TanStack Router mediante [useLocation](https://tanstack.com/router/latest/docs/framework/react/api/router/useLocationHook) y [useNavigate](https://tanstack.com/router/latest/docs/framework/react/api/router/useNavigateHook).

Usa una ruta de archivo catch-all de TanStack (p. ej. `_layout/$` o `routes/workspace.$`) para capturar rutas dinámicas de componentes.

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

Se integra con Next.js App Router mediante [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router), [usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname) y [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params).

> **Nota de Next.js**:
>
> 1. Para rutas de App Router renderizadas de forma estática, envuelve el componente cliente que lee `useSearchParams()` en `<Suspense>`; las compilaciones de producción exigen este límite. Consulta la documentación enlazada de Next.js para ver alternativas de renderizado dinámico.
> 2. Define una ruta catch-all opcional `app/[[...slug]]/page.tsx` para que las rutas de componentes de varios segmentos se resuelvan sin errores 404.

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

## Adaptadores de historial integrados

Para aplicaciones independientes, GitHub Pages o entornos de Node/pruebas, se proporcionan tres adaptadores integrados:

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

### Códec de URL

Todos los adaptadores usan `encodeLocation(loc, basePath, separator)` y `decodeLocation(url, basePath)`:

- Las URL de hash unen los segmentos con `:` (`#/table:local`). Las URL del navegador los unen con `/` (`/app/table/local`). La decodificación acepta cualquiera de los dos separadores.
- Una ruta vacía puede llevar parámetros: `?tab=a` y `#/?tab=a` se decodifican como `{ path: [], params: { tab: "a" } }`.
- `basePath` solo coincide en un límite de segmento: con `basePath: "/admin"`, `/admin/users` se decodifica como `["users"]`, mientras que `/administrator` queda fuera de esta navegación y se decodifica como una ubicación vacía.
- Las rutas Unicode y las claves/valores de los parámetros se escapan limpiamente con `encodeURIComponent`.
- Las cadenas de parámetros vacías (p. ej. `{ query: "" }`) se conservan como `?query=` en lugar de descartarse.
- Los segmentos con dos puntos, barras o símbolos de consulta incrustados se codifican de forma fiable.

---

## Sincronización del historial (`syncHistory`)

`syncHistory(navigation, adapter)` conecta una instancia de `AutoNavigation` a un `AutoHistoryAdapter`.

- **Aislamiento de rutas intermedias**: al navegar a un hijo cargado de forma diferida, los estados intermedios de la ruta provocan el montaje en React sin escribir URL inacabadas. Solo las navegaciones confirmadas (`subscribeCommit`) escriben en el historial.
- **Prevención de eco**: las navegaciones iniciadas desde cambios externos de la URL llevan `source: "history"`. Sus eventos de confirmación nunca se devuelven como eco al adaptador.
- **Identidad de la transición**: las navegaciones externas rechazadas o prohibidas se reconcilian con la ruta válida más cercana y llaman a `adapter.replace()`. Las navegaciones antiguas fallidas no pueden sobrescribir navegaciones del usuario más recientes.
- **Sincronización inicial**: una URL no vacía que difiere de la ubicación confirmada navega hasta allí. Una URL vacía recibe la ubicación confirmada mediante `adapter.replace()`. Una URL que ya coincide se deja tal cual, de modo que recrear el adaptador (por ejemplo `history={createHashHistory()}` escrito inline) nunca cancela una navegación pendiente.
- **URL de hijos por defecto**: cuando un destino del historial se resuelve en un hijo por defecto, la ruta completada sustituye a la URL incompleta conservando sus parámetros y su entrada en el historial.
- **Escrituras asíncronas**: las escrituras se ejecutan en orden. Una confirmación más reciente solo se compara con `read()` después de que terminen las escrituras anteriores, por lo que no puede perderse el retorno a la URL original. Las notificaciones retrasadas de una URL ya observada no cancelan una navegación diferida más reciente. Un cambio real del historial de vuelta a la ruta confirmada sí cancela el trabajo pendiente.
- **Limpieza**: devuelve una función de cancelación de suscripción que desconecta los listeners y descarta las escrituras en cola. Una escritura ya emitida a un router externo no puede ser cancelada por el puente.

El `push`/`replace` del adaptador debe actualizar `read()` de forma síncrona, devolver una promesa que se resuelva cuando `read()` refleje la finalización, o devolver `void` y confirmar la escritura diferida mediante `subscribe`. Las notificaciones deben describir la ubicación que `read()` devuelve en ese momento. Las promesas rechazadas se informan mediante `console.error` y liberan la siguiente escritura en cola. Una escritura `void` diferida se libera cuando el adaptador publica una ubicación distinta (por ejemplo una redirección) o tras 2 segundos sin confirmación, como una navegación bloqueada por el router. Si una promesa se resuelve antes de que `read()` refleje la nueva ubicación, la notificación posterior de esa ubicación se trata como la misma escritura, no como una navegación nueva.

---

## Integración de componentes: AutoMenu y AutoTabs

Para un contenedor diferido personalizado, declara su hijo como `{ id: "details", awaitRegistration: true }` cuando la entrada ordinaria deba esperar a que ese contenedor se registre y resuelva su `defaultChild`. `AutoTabs` lo establece automáticamente para los elementos con `children` anidados. Esto evita confirmar una URL del padre antes de conocer el hijo por defecto.

### AutoMenu

`AutoMenu` admite la participación declarativa en el árbol de navegación mediante la prop `route`:

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

- **Un solo nivel de ruta**: un menú añade exactamente un segmento por debajo de su propia ruta. Los grupos solo organizan entradas, así que cada hoja es un hijo directo (`workspace:profile`, no `workspace:settings:profile`); por eso los ids deben ser únicos en todo el menú. Una hoja hereda los `disabled`, `hidden`, `roles` y `permissions` de sus grupos.
- **Selección**: con `route`, la entrada seleccionada es la hoja cuyo id es el segmento hijo activo. De lo contrario, dentro de un provider, es la hoja cuyo `target` es el prefijo más largo de la ruta actual.
- **`content`**: cuando se proporciona en cualquier elemento, `AutoMenu` envuelve el layout en `.auto-menu-container` y monta el contenido del elemento seleccionado en `.auto-menu-content`. Si ningún elemento define `content`, se renderiza el elemento tradicional de barra lateral única.
- **`target`**: un destino de acceso directo. Al hacer clic se invoca `nav.goto(target)` sin montar contenido bajo ese elemento. Las cadenas cíclicas de accesos directos (p. ej. `a -> b -> a`) se detectan y se impiden.

### AutoTabs

`AutoTabs` admite el cambio de pestañas dirigido por la ruta:

```tsx
<AutoTabs
  route={{ name: "tabs", defaultChild: "basic" }}
  items={[
    { id: "basic", label: "Basic", content: <BasicTab /> },
    { id: "advanced", label: "Advanced", content: <AdvancedTab /> },
  ]}
/>
```

- **Política de conflictos**: `route` y `value` son mutuamente excluyentes. Cuando se proporciona `route`, se debe omitir `value` porque `AutoNavigation` es el dueño de la selección. Si se suministran ambos, `route` tiene prioridad y el modo desarrollo registra la advertencia `RAC-TABS-ROUTE-VALUE`.
- **Pestañas anidadas**: las pestañas hijas se resuelven en relación con la ruta de su pestaña padre sin doble navegación.

---

## Referencia de la API principal

### `createAutoNavigation(options)`

Crea una instancia aislada del motor de navegación.

```ts
const nav = createAutoNavigation({
  initialPath: ["table", "local"],
  canAccess: (item) => true,
  readyTimeoutMs: 3000,
});
```

### `<AutoNavigationProvider>`

Provider de contexto de React que gestiona el ciclo de vida de la navegación. Pasa a `history` el adaptador devuelto por cualquiera de los hooks de framework anteriores. Configura los permisos mediante `AutoConfigProvider.config.canAccess`; las instancias de navegación creadas externamente también conservan su comprobador de permisos de fábrica.

| Prop            | Tipo                          | Descripción                                                                                |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| `navigation`    | `AutoNavigation`              | Instancia de navegación previamente creada, opcional.                                      |
| `initialPath`   | `string \| readonly string[]` | Ruta inicial si se omite `navigation`.                                                     |
| `history`       | `AutoHistoryAdapter`          | Adaptador opcional. Omitirlo desactiva la sincronización del historial.                    |
| `initialParams` | `Record<string, string>`      | Parámetros iniciales si se omite `navigation`.                                             |
| `hashSync`      | `boolean`                     | Atajo obsoleto del adaptador de hash, por defecto `false`. Prefiere `history={createHashHistory()}`. |

### `useAutoRoute(config)`

Declara la presencia de un componente en el árbol de navegación.

Cuando una ruta inicial termina en un nodo con un `defaultChild` accesible, el registro resuelve y confirma ese hijo en la ruta real. El historial usa reemplazo para esta normalización, de modo que el hijo mostrado, la URL y la señal de la ruta coinciden sin añadir una entrada.

`setParams` fusiona un parche de parámetros: las claves omitidas quedan sin cambios, `null` elimina una clave y `""` conserva un valor vacío. Durante una navegación pendiente, edita los parámetros del destino y espera esa misma navegación en lugar de cancelarla. Editar un destino del historial entrante sustituye su URL al confirmarse.

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

Contenedor con ámbito explícito para componentes de layout personalizados:

```tsx
<AutoRouteScope path={["dashboard", "analytics"]}>
  <CustomMetricsPanel />
</AutoRouteScope>
```
