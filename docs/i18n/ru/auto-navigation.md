# AutoNavigation и навигация по дереву компонентов

[English](../../auto-navigation.md) | [简体中文](../zh-CN/auto-navigation.md) | [繁體中文](../zh-TW/auto-navigation.md) | [日本語](../ja/auto-navigation.md) | [한국어](../ko/auto-navigation.md) | [Español](../es/auto-navigation.md) | [Français](../fr/auto-navigation.md) | [Deutsch](../de/auto-navigation.md) | [Português (Brasil)](../pt-BR/auto-navigation.md) | **Русский**

React Auto Components предоставляет систему навигации с древовидной структурой, в которой сами компоненты напрямую участвуют в дереве навигации, отделяя местоположение, параметры, права доступа и историю URL.

---

## Два уровня интеграции

Выберите уровень интеграции, который лучше всего подходит вашей архитектуре:

### Уровень 1: лёгкая интеграция с роутером (без провайдера)

Если приложение уже использует внешний роутер (например React Router, TanStack Router или Next.js) и нужно лишь, чтобы `AutoMenu` или `AutoTabs` отражали и контролировали текущий URL, используйте напрямую их стандартные управляемые пропсы `value` и `onChange`:

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

**Когда выбирать уровень 1:**

- Переключение страниц верхнего уровня полностью управляется внешним роутером.
- Не требуется обнаружение местоположения во вложенном дереве компонентов.
- Не нужны хуки `useAutoRoute` в области компонента, сигналы прерывания (abort signals) и асинхронные протоколы ожидания при ленивом монтировании.

---

### Уровень 2: навигация по дереву компонентов (`AutoNavigation` + адаптер истории)

Уровень 2 превращает иерархию компонентов в живое декларативное дерево навигации. Цели навигации — структурированные пути (например `workspace:projects:details` или `["workspace", "projects", "details"]`), параметры отделены от структуры пути, а навигация одинаково работает и внутри React, и за его пределами.

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

**Когда выбирать уровень 2:**

- Глубоко вложенные деревья компонентов, требующие относительной навигации (`./child`, `../sibling`).
- Отделённые параметры (`params: { projectId: "42", tab: "audit" }`).
- Асинхронное ленивое монтирование компонентов, при котором `goto` ожидает регистрации дочернего узла перед завершением перехода.
- Точная сверка прав (`canAccess`, `roles`, `permissions`, `disabled`, `hidden`) с автоматической коррекцией URL, если цель становится запрещённой или размонтируется.
- Встроенное управление `AbortSignal`, устойчивое к двойному монтированию в StrictMode React 18/19.

---

## Официальные примеры адаптеров для фреймворков

Чтобы синхронизировать `AutoNavigation` с внешним роутером фреймворка (уровень 2), реализуйте `AutoHistoryAdapter` с `read()`, `push()`, `replace()` и `subscribe()`.

> **Важно**: пользовательский адаптер должен читать актуальное местоположение роутера через refs, чтобы избежать устаревших замыканий, и не должен пересоздавать слушателей синхронизации при каждом обновлении местоположения — так незавершённые ленивые навигации никогда не прерываются.

Эффекты публикуют текущий URL через `onChange(location, { type: "snapshot" })`, включая первый запуск и повторное воспроизведение в StrictMode. Неизменённый снимок не прерывает ожидающую навигацию дочернего узла; изменённый снимок по-прежнему выполняет навигацию, включая возврат к ранее зафиксированному маршруту. Для известного намерения внешней навигации используйте `{ type: "navigation" }`, даже если её URL не изменился. Уведомления, содержащие только местоположение, сохраняют прежнюю семантику навигации (с обнаружением эха записи), поэтому существующие адаптеры, повторяющие начальный снимок, должны добавить эти метаданные или сами подавлять этот повтор.

Для отложенной записи `void`, которая была заменена новой, мост помнит её адрес назначения и корректирует позднее подтверждение, возвращаясь к последнему задуманному URL. Если адаптер полностью отказывается от этой записи, позднейший снимок того же адреса назначения невозможно отличить от её подтверждения. В таком случае публикуйте известную внешнюю навигацию как `{ type: "navigation" }`; она остаётся приоритетной.

### 1. React Router (v6 / v7)

Интеграция с React Router через [useLocation](https://reactrouter.com/api/hooks/useLocation) и [useNavigate](https://reactrouter.com/api/hooks/useNavigate).

Настройте роутер с splat / catch-all маршрутом (например `<Route path="workspace/*" element={<App />} />`), чтобы вложенные пути компонентов обрабатывались без неожидаемых 404.

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

Интеграция с TanStack Router через [useLocation](https://tanstack.com/router/latest/docs/framework/react/api/router/useLocationHook) и [useNavigate](https://tanstack.com/router/latest/docs/framework/react/api/router/useNavigateHook).

Используйте catch-all файловый маршрут TanStack (например `_layout/$` или `routes/workspace.$`), чтобы перехватывать динамические пути компонентов.

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

Интеграция с Next.js App Router через [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router), [usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname) и [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params).

> **Примечание про Next.js**:
>
> 1. Для статически рендерящихся маршрутов App Router оберните клиентский компонент, читающий `useSearchParams()`, в `<Suspense>`; продуктовые сборки требуют этой границы. Альтернативы с динамическим рендерингом см. в связанной документации Next.js.
> 2. Определите необязательный catch-all маршрут `app/[[...slug]]/page.tsx`, чтобы многосегментные пути компонентов разрешались без 404.

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

## Встроенные адаптеры истории

Для автономных приложений, GitHub Pages или окружений Node/тестирования предусмотрены три встроенных адаптера:

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

### Кодек URL

Все адаптеры используют `encodeLocation(loc, basePath, separator)` и `decodeLocation(url, basePath)`:

- Hash-URL соединяют сегменты через `:` (`#/table:local`). URL браузера соединяют их через `/` (`/app/table/local`). Декодирование принимает любой из разделителей.
- Пустой путь всё же может нести параметры: `?tab=a` и `#/?tab=a` декодируются в `{ path: [], params: { tab: "a" } }`.
- `basePath` совпадает только по границе сегмента: при `basePath: "/admin"` путь `/admin/users` декодируется в `["users"]`, тогда как `/administrator` лежит вне этой навигации и декодируется как пустое местоположение.
- Пути в Unicode и ключи/значения параметров корректно экранируются через `encodeURIComponent`.
- Пустые строки параметров (например `{ query: "" }`) сохраняются как `?query=`, а не отбрасываются.
- Сегменты со встроенными двоеточиями, слэшами или символами запроса кодируются надёжно.

---

## Синхронизация истории (`syncHistory`)

`syncHistory(navigation, adapter)` соединяет экземпляр `AutoNavigation` с `AutoHistoryAdapter`.

- **Изоляция промежуточных путей**: при переходе к лениво загружаемому дочернему узлу промежуточные состояния маршрута вызывают монтирование React, не записывая незавершённые URL. В историю пишут только зафиксированные навигации (`subscribeCommit`).
- **Предотвращение эха**: навигации, инициированные внешними изменениями URL, несут `source: "history"`. Их события фиксации никогда не передаются обратно в адаптер.
- **Идентичность перехода**: отклонённые или запрещённые внешние навигации сводятся к ближайшему допустимому маршруту и вызывают `adapter.replace()`. Более старые неудачные навигации не могут перезаписать более новые навигации пользователя.
- **Начальная синхронизация**: непустой URL, отличающийся от зафиксированного местоположения, вызывает переход к нему. Пустой URL получает зафиксированное местоположение через `adapter.replace()`. Совпадающий URL не трогается, поэтому пересоздание адаптера (например, инлайновая запись `history={createHashHistory()}`) никогда не отменяет ожидающую навигацию.
- **URL дочерних узлов по умолчанию**: когда адрес назначения из истории разрешается в дочерний узел по умолчанию, завершённый путь заменяет неполный URL, сохраняя его параметры и запись в истории.
- **Асинхронные записи**: записи выполняются по порядку. Более новая фиксация сравнивается с `read()` только после завершения более ранних записей, поэтому возврат к исходному URL не может потеряться. Отложенные уведомления об уже наблюдавшемся URL не отменяют более новую ленивую навигацию. Реальное изменение истории с возвратом к зафиксированному маршруту всё же отменяет незавершённую работу.
- **Очистка**: возвращается функция отписки, которая отключает слушателей и отбрасывает поставленные в очередь записи. Запись, уже отправленная во внешний роутер, не может быть отменена мостом.

`push`/`replace` адаптера должны либо синхронно обновлять `read()`, либо возвращать промис, который завершается, когда `read()` отразит завершение, либо возвращать `void` и подтверждать отложенную запись через `subscribe`. Уведомления должны описывать местоположение, которое в данный момент возвращает `read()`. Отклонённые промисы сообщаются через `console.error` и освобождают следующую запись из очереди. Отложенная запись `void` освобождается, когда адаптер публикует другое местоположение (например редирект) или после 2 секунд без подтверждения — так бывает, когда навигация заблокирована роутером. Если промис разрешается до того, как `read()` отразит новое местоположение, более позднее уведомление об этом местоположении считается той же записью, а не новой навигацией.

---

## Интеграция компонентов: AutoMenu и AutoTabs

Для пользовательского ленивого контейнера объявляйте его дочерний элемент как `{ id: "details", awaitRegistration: true }`, когда обычный вход должен дождаться, пока этот контейнер зарегистрируется и разрешит свой `defaultChild`. `AutoTabs` делает это автоматически для элементов с вложенными `children`. Это предотвращает фиксацию родительского URL до того, как станет известен дочерний узел по умолчанию.

### AutoMenu

`AutoMenu` поддерживает декларативное участие в дереве навигации через проп `route`:

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

- **Один уровень маршрута**: меню добавляет ровно один сегмент ниже собственного маршрута. Группы лишь организуют записи, поэтому каждый лист — прямой потомок (`workspace:profile`, а не `workspace:settings:profile`), вот почему id должны быть уникальны во всём меню. Лист наследует `disabled`, `hidden`, `roles` и `permissions` своих групп.
- **Выбор**: при заданном `route` выбранным считается лист, чей id является активным сегментом-потомком. Иначе, внутри провайдера, это лист, чей `target` — самый длинный префикс текущего пути.
- **`content`**: если задан хотя бы на одном элементе, `AutoMenu` оборачивает макет в `.auto-menu-container` и монтирует содержимое выбранного элемента в `.auto-menu-content`. Если ни у одного элемента нет `content`, рендерится традиционный одиночный элемент боковой панели.
- **`target`**: цель-ярлык. Клик вызывает `nav.goto(target)` и не монтирует содержимое под этим элементом. Циклические цепочки ярлыков (например `a -> b -> a`) обнаруживаются и предотвращаются.

### AutoTabs

`AutoTabs` поддерживает переключение вкладок, управляемое маршрутом:

```tsx
<AutoTabs
  route={{ name: "tabs", defaultChild: "basic" }}
  items={[
    { id: "basic", label: "Basic", content: <BasicTab /> },
    { id: "advanced", label: "Advanced", content: <AdvancedTab /> },
  ]}
/>
```

- **Политика конфликтов**: `route` и `value` взаимоисключающие. Когда задан `route`, `value` следует опустить, поскольку выбором владеет `AutoNavigation`. Если переданы оба, приоритет имеет `route`, а в режиме разработки выводится предупреждение `RAC-TABS-ROUTE-VALUE`.
- **Вложенные вкладки**: дочерние вкладки разрешаются относительно маршрута родительской вкладки без двойной навигации.

---

## Справочник по основному API

### `createAutoNavigation(options)`

Создаёт изолированный экземпляр движка навигации.

```ts
const nav = createAutoNavigation({
  initialPath: ["table", "local"],
  canAccess: (item) => true,
  readyTimeoutMs: 3000,
});
```

### `<AutoNavigationProvider>`

React-провайдер контекста, управляющий жизненным циклом навигации. Передайте в `history` адаптер, возвращённый любым из хуков выше. Права настраиваются через `AutoConfigProvider.config.canAccess`; экземпляры навигации, созданные извне, также сохраняют заданную при создании функцию проверки прав.

| Проп | Тип | Описание |
| --- | --- | --- |
| `navigation` | `AutoNavigation` | Необязательный заранее созданный экземпляр навигации. |
| `initialPath` | `string \| readonly string[]` | Начальный путь, если `navigation` опущен. |
| `history` | `AutoHistoryAdapter` | Необязательный адаптер. Опустите его, чтобы отключить синхронизацию с историей. |
| `initialParams` | `Record<string, string>` | Начальные параметры, если `navigation` опущен. |
| `hashSync` | `boolean` | Устаревший ярлык hash-адаптера, по умолчанию `false`. Предпочтите `history={createHashHistory()}`. |

### `useAutoRoute(config)`

Объявляет присутствие компонента в дереве навигации.

Когда начальный путь заканчивается на узле с доступным `defaultChild`, регистрация разрешается и фиксирует этот дочерний узел в фактическом пути. История использует для этой нормализации замену, поэтому отображаемый дочерний узел, URL и сигнал маршрута согласованы без добавления новой записи.

`setParams` сливает патч параметров: опущенные ключи остаются без изменений, `null` удаляет ключ, а `""` сохраняет пустое значение. Во время ожидающей навигации он редактирует параметры адреса назначения и ждёт ту же навигацию вместо того, чтобы отменять её. Редактирование входящего адреса назначения из истории заменяет его URL при фиксации.

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

Явная привязка области контейнера для пользовательских компонентов макета:

```tsx
<AutoRouteScope path={["dashboard", "analytics"]}>
  <CustomMetricsPanel />
</AutoRouteScope>
```
