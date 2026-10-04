# AutoNavigation & 컴포넌트 트리 내비게이션

[English](../../auto-navigation.md) | [简体中文](../zh-CN/auto-navigation.md) | **한국어**

React Auto Components는 컴포넌트 자신이 내비게이션 트리에 직접 참여하는 트리 구조 내비게이션 시스템을 제공하며, 위치, 파라미터, 접근 권한, URL 히스토리를 서로 분리합니다.

---

## 두 가지 통합 등급

아키텍처에 가장 맞는 통합 등급을 선택하세요:

### 등급 1: 가벼운 라우터 통합 (Provider 불필요)

앱이 이미 외부 라우터(React Router, TanStack Router, Next.js 등)를 쓰고 있고 `AutoMenu`나 `AutoTabs`가 현재 URL을 반영하고 제어하기만 하면 된다면, 표준 제어형 `value`와 `onChange` props를 직접 사용하세요:

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

**등급 1을 쓰는 경우:**

- 최상위 페이지 전환이 외부 라우터에서 완전히 관리될 때.
- 중첩 컴포넌트 트리의 위치 탐색이 필요 없을 때.
- 컴포넌트 범위의 `useAutoRoute` 훅, abort 신호, 비동기 지연 마운트 대기 프로토콜이 필요 없을 때.

---

### 등급 2: 컴포넌트 트리 내비게이션 (`AutoNavigation` + 히스토리 어댑터)

등급 2는 컴포넌트 계층을 살아 있는 선언적 내비게이션 트리로 바꿉니다. 내비게이션 대상은 구조화된 경로(예: `workspace:projects:details` 또는 `["workspace", "projects", "details"]`)이고, 파라미터는 경로 구조에서 분리되며, 내비게이션은 React 안팎에서 매끄럽게 동작합니다.

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

**등급 2를 쓰는 경우:**

- 상대 내비게이션(`./child`, `../sibling`)이 필요한 깊게 중첩된 컴포넌트 트리.
- 분리된 파라미터(`params: { projectId: "42", tab: "audit" }`).
- `goto`가 전환을 확정하기 전에 자식 노드 등록을 기다리는 비동기 지연 컴포넌트 마운팅.
- 세밀한 권한 조정(`canAccess`, `roles`, `permissions`, `disabled`, `hidden`)과, 대상이 금지되거나 언마운트될 때 자동 URL 수정.
- React 18/19 StrictMode 이중 마운트에 강건한 내장 `AbortSignal` 관리.

---

## 공식 프레임워크 어댑터 예제

`AutoNavigation`을 외부 프레임워크 라우터와 동기화하려면(등급 2), `read()`, `push()`, `replace()`, `subscribe()`를 갖춘 `AutoHistoryAdapter`를 구현하세요.

> **중요**: 커스텀 어댑터는 스테일 클로저를 피하려고 ref로 최신 라우터 위치를 읽어야 하며, 위치가 바뀔 때마다 동기화 리스너를 다시 만들지 않아야 대기 중인 지연 내비게이션이 결코 중단되지 않습니다.

이펙트는 초기 실행과 StrictMode 재실행을 포함하여 `onChange(location, { type: "snapshot" })`으로 현재 URL을 게시합니다. 변하지 않은 스냅샷은 자식의 대기 중인 내비게이션을 중단하지 않으며, 변한 스냅샷은 이전에 확정된 라우트로의 복귀를 포함하여 여전히 내비게이션을 수행합니다. URL이 변하지 않았더라도 알려진 외부 내비게이션 의도에는 `{ type: "navigation" }`을 사용하세요. 위치만 담은 알림은 기존 내비게이션 의미(쓰기 에코 감지 포함)를 유지하므로, 초기 스냅샷을 재생하는 기존 어댑터는 이 메타데이터를 추가하거나 그 재생을 스스로 억제해야 합니다.

대체된 지연된 `void` 쓰기에 대해 브리지는 그 목적지를 기억하고 늦은 확인(acknowledgment)을 최신 의도된 URL로 수정합니다. 어댑터가 그 쓰기를 완전히 버리면, 같은 목적지의 이후 스냅샷은 그 확인과 구별되지 않습니다. 그런 경우 알려진 외부 내비게이션을 `{ type: "navigation" }`으로 게시하세요. 그것은 여전히 권위를 가집니다.

### 1. React Router (v6 / v7)

React Router의 [useLocation](https://reactrouter.com/api/hooks/useLocation)과 [useNavigate](https://reactrouter.com/api/hooks/useNavigate)로 통합합니다.

라우터에 스플랫 / catch-all 라우트(예: `<Route path="workspace/*" element={<App />} />`)를 설정하여 중첩 컴포넌트 경로가 예기치 않은 404 없이 처리되도록 하세요.

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

TanStack Router의 [useLocation](https://tanstack.com/router/latest/docs/framework/react/api/router/useLocationHook)과 [useNavigate](https://tanstack.com/router/latest/docs/framework/react/api/router/useNavigateHook)로 통합합니다.

동적 컴포넌트 경로를 캡처하려면 TanStack catch-all 파일 라우트(예: `_layout/$` 또는 `routes/workspace.$`)를 사용하세요.

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

Next.js App Router의 [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router), [usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname), [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)로 통합합니다.

> **Next.js 참고**:
>
> 1. 정적으로 렌더링되는 App Router 라우트에서는 `useSearchParams()`를 읽는 클라이언트 컴포넌트를 `<Suspense>`로 감싸세요. 프로덕션 빌드에는 이 경계가 필요합니다. 동적 렌더링 대안은 링크된 Next.js 문서를 참고하세요.
> 2. 선택적 catch-all 라우트 `app/[[...slug]]/page.tsx`를 정의하여 여러 세그먼트로 된 컴포넌트 경로가 404 없이 매끄럽게 해석되도록 하세요.

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

## 내장 히스토리 어댑터

독립 실행 앱, GitHub Pages, Node/테스트 환경을 위해 세 개의 내장 어댑터를 제공합니다:

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

### URL 코덱

모든 어댑터는 `encodeLocation(loc, basePath, separator)`와 `decodeLocation(url, basePath)`를 사용합니다:

- 해시 URL은 세그먼트를 `:`로 잇습니다(`#/table:local`). 브라우저 URL은 `/`로 잇습니다(`/app/table/local`). 디코딩은 두 구분자 모두 받아들입니다.
- 빈 경로도 파라미터를 가질 수 있습니다: `?tab=a`와 `#/?tab=a`는 `{ path: [], params: { tab: "a" } }`로 디코딩됩니다.
- `basePath`는 세그먼트 경계에서만 매칭됩니다: `basePath: "/admin"`이면 `/admin/users`는 `["users"]`로 디코딩되고, `/administrator`는 이 내비게이션 밖이므로 빈 위치로 디코딩됩니다.
- 유니코드 경로와 파라미터 키/값은 `encodeURIComponent`로 깔끔하게 이스케이프됩니다.
- 빈 파라미터 문자열(예: `{ query: "" }`)은 버려지지 않고 `?query=`로 유지됩니다.
- 콜론, 슬래시, 쿼리 기호를 포함한 세그먼트도 안정적으로 인코딩됩니다.

---

## 히스토리 동기화 (`syncHistory`)

`syncHistory(navigation, adapter)`는 `AutoNavigation` 인스턴스를 `AutoHistoryAdapter`에 연결합니다.

- **중간 경로 격리**: 지연 로딩되는 자식으로 이동할 때 중간 라우트 상태는 완성되지 않은 URL을 쓰지 않고 React 마운트만 유발합니다. 히스토리에 기록되는 것은 확정된 내비게이션(`subscribeCommit`)뿐입니다.
- **에코 방지**: 외부 URL 변화에서 시작된 내비게이션은 `source: "history"`를 담습니다. 그 확정 이벤트는 어댑터로 되돌려지지 않습니다.
- **전환 정체성**: 거부되거나 금지된 외부 내비게이션은 가장 가까운 유효 라우트로 조정되고 `adapter.replace()`를 호출합니다. 더 오래된 실패한 내비게이션은 더 새로운 사용자 내비게이션을 덮어쓸 수 없습니다.
- **초기 동기화**: 확정된 위치와 다른 비어 있지 않은 URL은 그곳으로 이동합니다. 빈 URL은 `adapter.replace()`를 통해 확정된 위치를 받습니다. 이미 일치하는 URL은 그대로 두므로, 어댑터를 다시 만들어도(예: 인라인으로 쓴 `history={createHashHistory()}`) 대기 중인 내비게이션이 취소되지 않습니다.
- **기본 자식 URL**: 히스토리 목적지가 기본 자식으로 해석되면, 완성된 경로가 파라미터와 히스토리 항목을 보존한 채 불완전한 URL을 대체합니다.
- **비동기 쓰기**: 쓰기는 순서대로 실행됩니다. 더 새로운 확정은 이전 쓰기가 모두 끝난 뒤에만 `read()`와 비교되므로 원래 URL로의 복귀가 유실되지 않습니다. 이미 관찰된 URL에 대한 지연된 알림은 더 새로운 지연 내비게이션을 취소하지 않습니다. 확정된 라우트로 돌아가는 실제 히스토리 변화는 여전히 대기 중인 작업을 취소합니다.
- **정리**: 리스너를 끊고 대기 중인 쓰기를 버리는 구독 해제 함수를 반환합니다. 외부 라우터에 이미 발행된 쓰기는 브리지가 취소할 수 없습니다.

어댑터의 `push`/`replace`는 `read()`를 동기적으로 갱신하거나, `read()`가 완료를 반영할 때 이행되는 프로미스를 반환하거나, `void`를 반환하고 `subscribe`를 통해 지연 쓰기를 확인해야 합니다. 알림은 `read()`가 현재 반환하는 위치를 설명해야 합니다. 거부된 프로미스는 `console.error`로 보고되고 다음 대기 중인 쓰기를 해제합니다. 지연된 `void` 쓰기는 어댑터가 다른 위치를 게시할 때(예: 리다이렉트) 또는 확인 없이 2초 후(예: 라우터가 막은 내비게이션)에 해제됩니다. 프로미스가 `read()`가 새 위치를 반영하기 전에 이행되면, 그 이후의 위치 알림은 새 내비게이션이 아니라 같은 쓰기로 취급됩니다.

---

## 컴포넌트 통합: AutoMenu와 AutoTabs

커스텀 지연 컨테이너에서 일반 진입이 해당 컨테이너의 등록과 `defaultChild` 해석을 기다려야 한다면, 그 자식을 `{ id: "details", awaitRegistration: true }`로 선언하세요. `AutoTabs`는 중첩 `children`이 있는 항목에 이 값을 자동으로 설정합니다. 이는 기본 자식이 알려지기 전에 부모 URL이 확정되는 것을 막습니다.

### AutoMenu

`AutoMenu`는 `route` prop을 통해 내비게이션 트리에 선언적으로 참여합니다:

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

- **하나의 라우트 등급**: 메뉴는 자기 라우트 아래에 정확히 하나의 세그먼트를 추가합니다. 그룹은 항목을 정리할 뿐이므로 모든 잎은 직계 자식입니다(`workspace:profile`, `workspace:settings:profile`이 아님). 그래서 id는 메뉴 전체에서 유일해야 합니다. 잎은 속한 그룹의 `disabled`, `hidden`, `roles`, `permissions`를 물려받습니다.
- **선택**: `route`가 있으면 선택된 항목은 id가 활성 자식 세그먼트인 잎입니다. 그렇지 않고 provider 안이라면, `target`이 현재 경로의 가장 긴 접두사인 잎입니다.
- **`content`**: 어떤 항목에든 제공되면 `AutoMenu`는 레이아웃을 `.auto-menu-container`로 감싸고 선택된 항목의 콘텐츠를 `.auto-menu-content`에 마운트합니다. `content`를 정의한 항목이 없으면 전통적인 단일 사이드바 요소가 렌더링됩니다.
- **`target`**: 지름길 대상입니다. 클릭하면 `nav.goto(target)`을 호출하며 그 항목 아래에 콘텐츠를 마운트하지 않습니다. 순환하는 지름길 체인(예: `a -> b -> a`)은 감지되어 차단됩니다.

### AutoTabs

`AutoTabs`는 라우트 주도 탭 전환을 지원합니다:

```tsx
<AutoTabs
  route={{ name: "tabs", defaultChild: "basic" }}
  items={[
    { id: "basic", label: "Basic", content: <BasicTab /> },
    { id: "advanced", label: "Advanced", content: <AdvancedTab /> },
  ]}
/>
```

- **충돌 정책**: `route`와 `value`는 상호 배타적입니다. `route`가 제공되면 `AutoNavigation`이 선택을 소유하므로 `value`를 생략해야 합니다. 둘 다 주면 `route`가 우선하며 개발 경고 `RAC-TABS-ROUTE-VALUE`가 기록됩니다.
- **중첩 탭**: 자식 탭은 이중 내비게이션 없이 부모 탭 라우트를 기준으로 상대적으로 해석됩니다.

---

## 핵심 API 참조

### `createAutoNavigation(options)`

격리된 내비게이션 엔진 인스턴스를 만듭니다.

```ts
const nav = createAutoNavigation({
  initialPath: ["table", "local"],
  canAccess: (item) => true,
  readyTimeoutMs: 3000,
});
```

### `<AutoNavigationProvider>`

내비게이션 수명 주기를 관리하는 React 컨텍스트 provider입니다. 위의 프레임워크 훅이 반환한 어댑터를 `history`에 넘기세요. 권한은 `AutoConfigProvider.config.canAccess`로 설정하며, 외부에서 만든 내비게이션 인스턴스도 팩토리의 권한 검사기를 유지합니다.

| Prop            | Type                          | Description                                                                                |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| `navigation`    | `AutoNavigation`              | 선택 사항인 미리 생성된 내비게이션 인스턴스입니다.                                            |
| `initialPath`   | `string \| readonly string[]` | `navigation`을 생략했을 때 사용할 초기 경로입니다.                                            |
| `history`       | `AutoHistoryAdapter`          | 선택 사항인 어댑터입니다. 생략하면 히스토리 동기화가 비활성화됩니다.                              |
| `initialParams` | `Record<string, string>`      | `navigation`을 생략했을 때 사용할 초기 파라미터입니다.                                         |
| `hashSync`      | `boolean`                     | 폐기 예정인 해시 어댑터 지름길이며 기본값은 `false`입니다. `history={createHashHistory()}`를 권장합니다. |

### `useAutoRoute(config)`

컴포넌트의 내비게이션 트리 참여를 선언합니다.

초기 경로가 접근 가능한 `defaultChild`를 가진 노드에서 끝나면, 등록은 그 자식을 해석하여 실제 경로로 확정합니다. 히스토리는 이 정규화에 교체를 사용하므로, 항목을 추가하지 않고도 표시되는 자식, URL, 라우트 신호가 서로 일치합니다.

`setParams`는 파라미터 패치를 병합합니다: 생략된 키는 그대로 유지되고, `null`은 키를 제거하며, `""`는 빈 값을 보존합니다. 대기 중인 내비게이션 동안에는 목적지 파라미터를 편집하고 그 내비게이션을 취소하는 대신 같은 내비게이션을 기다립니다. 들어오는 히스토리 목적지를 편집하면 확정될 때 해당 URL을 대체합니다.

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

커스텀 레이아웃 컴포넌트를 위한 명시적 컨테이너 스코핑:

```tsx
<AutoRouteScope path={["dashboard", "analytics"]}>
  <CustomMetricsPanel />
</AutoRouteScope>
```








