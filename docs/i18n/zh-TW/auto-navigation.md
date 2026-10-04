# AutoNavigation 與元件樹導覽

[English](../../auto-navigation.md) | [简体中文](../zh-CN/auto-navigation.md) | **繁體中文** | [日本語](../ja/auto-navigation.md) | [한국어](../ko/auto-navigation.md) | [Español](../es/auto-navigation.md) | [Français](../fr/auto-navigation.md) | [Deutsch](../de/auto-navigation.md) | [Português (Brasil)](../pt-BR/auto-navigation.md) | [Русский](../ru/auto-navigation.md)

React Auto Components 提供以元件樹為基礎的導覽系統，讓元件本身直接參與導覽樹，並將位置、參數、存取權限與 URL 歷史記錄解耦。

---

## 兩種整合層級

依你的架構選擇最適合的整合層級：

### 第一層：輕量路由整合（不需 Provider）

如果你的應用程式已使用外部路由（例如 React Router、TanStack Router 或 Next.js），只需要 `AutoMenu` 或 `AutoTabs` 反映並控制目前 URL，直接使用它們標準的受控 `value` 與 `onChange` 屬性即可：

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

**何時使用第一層：**

- 頂層頁面切換完全由外部路由管理。
- 不需要在巢狀元件樹中探索位置。
- 不需要元件層級的 `useAutoRoute` hook、abort signal，或非同步延遲掛載的等待協定。

---

### 第二層：元件樹導覽（`AutoNavigation` + History 轉接器）

第二層將你的元件層級轉為即時、宣告式的導覽樹。導覽目標是結構化路徑（例如 `workspace:projects:details` 或 `["workspace", "projects", "details"]`），參數與路徑結構解耦，而且無論在 React 內部或外部都能順暢導覽。

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

**何時使用第二層：**

- 深度巢狀的元件樹，需要相對導覽（`./child`、`../sibling`）。
- 解耦的參數（`params: { projectId: "42", tab: "audit" }`）。
- 非同步延遲掛載元件，`goto` 會等子節點註冊完成後才完成轉場。
- 細粒度權限協調（`canAccess`、`roles`、`permissions`、`disabled`、`hidden`），當目標變成禁止存取或被解除安裝時自動修正 URL。
- 內建 `AbortSignal` 管理，可承受 React 18/19 StrictMode 的重複掛載。

---

## 官方框架轉接器範例

要讓 `AutoNavigation` 與外部框架路由同步（第二層），請實作具有 `read()`、`push()`、`replace()` 與 `subscribe()` 的 `AutoHistoryAdapter`。

> **重要**：自訂轉接器應透過 ref 讀取最新的路由位置以避免閉包過期，並且不得在每次位置更新時重建同步監聽器，以免中斷等待中的延遲導覽。

Effect 會以 `onChange(location, { type: "snapshot" })` 發布目前 URL，包含初次執行與 StrictMode 重放。未變更的快照不會中斷子元件等待中的導覽；已變更的快照仍會導覽，包括回到先前已提交的路由。已知的外部導覽意圖請使用 `{ type: "navigation" }`，即使 URL 沒有變更也一樣。僅帶位置的通知保留原有的導覽語意（含寫入回聲偵測），因此會重放初始快照的現有轉接器應加上此中繼資料，或自行抑制該重放。

對於被取代的延遲 `void` 寫入，橋接器會記住其目的地，並將遲到的確認修正回最新意圖的 URL。如果轉接器完全放棄該筆寫入，之後同一目的地的快照就無法與其確認區分；這種情況下請將該次已知的外部導覽發布為 `{ type: "navigation" }`，它仍然具權威性。

### 1. React Router (v6 / v7)

使用 [useLocation](https://reactrouter.com/api/hooks/useLocation) 與 [useNavigate](https://reactrouter.com/api/hooks/useNavigate) 與 React Router 整合。

將路由器設定為使用 splat / 全捕捉路由（例如 `<Route path="workspace/*" element={<App />} />`），讓巢狀元件路徑被正確處理，不會出現意外的 404。

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

使用 [useLocation](https://tanstack.com/router/latest/docs/framework/react/api/router/useLocationHook) 與 [useNavigate](https://tanstack.com/router/latest/docs/framework/react/api/router/useNavigateHook) 與 TanStack Router 整合。

使用 TanStack 的全捕捉檔案路由（例如 `_layout/$` 或 `routes/workspace.$`）來捕捉動態元件路徑。

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

使用 [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)、[usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname) 與 [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params) 與 Next.js App Router 整合。

> **Next.js 注意事項**：
>
> 1. 對於靜態渲染的 App Router 路由，請將讀取 `useSearchParams()` 的用戶端元件包在 `<Suspense>` 內；正式環境建置需要這個邊界。動態渲染的替代方案請參閱連結的 Next.js 文件。
> 2. 定義可選的全捕捉路由 `app/[[...slug]]/page.tsx`，讓多段的元件路徑順利解析而不會出現 404。

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

## 內建 History 轉接器

針對獨立應用程式、GitHub Pages 或 Node／測試環境，庫內提供三個內建轉接器：

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

### URL 編解碼器

所有轉接器都使用 `encodeLocation(loc, basePath, separator)` 與 `decodeLocation(url, basePath)`：

- Hash URL 以 `:` 串接路徑段（`#/table:local`）；瀏覽器 URL 以 `/` 串接（`/app/table/local`）。解碼時兩種分隔符皆可接受。
- 空路徑仍可攜帶參數：`?tab=a` 與 `#/?tab=a` 都會解碼為 `{ path: [], params: { tab: "a" } }`。
- `basePath` 只在路徑段邊界上比對：設定 `basePath: "/admin"` 時，`/admin/users` 會解碼為 `["users"]`，而 `/administrator` 不屬於這個導覽，會解碼為空位置。
- Unicode 路徑與參數鍵值都透過 `encodeURIComponent` 乾淨轉義。
- 空字串參數（例如 `{ query: "" }`）會保留為 `?query=`，不會被丟棄。
- 內嵌冒號、斜線或問號的路徑段都能被可靠編碼。

---

## 歷史同步（`syncHistory`）

`syncHistory(navigation, adapter)` 將 `AutoNavigation` 實例連接到 `AutoHistoryAdapter`。

- **中間路徑隔離**：導覽到延遲載入的子節點時，中間路由狀態只觸發 React 掛載，不寫入未完成的 URL。只有已提交的導覽（`subscribeCommit`）才會寫入歷史記錄。
- **回聲防制**：由外部 URL 變更發起的導覽帶有 `source: "history"`，其提交事件絕不會回寫到轉接器。
- **轉場身分識別**：被拒絕或被禁止的外部導覽會對齊到最近的有效路由並呼叫 `adapter.replace()`。較舊的失敗導覽無法覆寫較新的使用者導覽。
- **初始同步**：非空且與已提交位置不同的 URL 會導覽到該位置；空 URL 會透過 `adapter.replace()` 取得已提交位置；已一致的 URL 則保持不動，因此重建轉接器（例如內聯寫 `history={createHashHistory()}`）不會取消等待中的導覽。
- **預設子節點 URL**：當歷史記錄目的地解析到預設子節點時，完成後的完整路徑會取代未完成的 URL，同時保留其參數與歷史記錄項目。
- **非同步寫入**：寫入依序執行。較新的提交要等先前的寫入完成後才與 `read()` 比對，因此回到原始 URL 的操作不會遺失。已觀察過 URL 的延遲通知不會取消較新的延遲導覽；真正回到已提交路由的歷史變更仍會取消等待中的工作。
- **清理**：回傳取消訂閱函式，中斷監聽器並丟棄排隊中的寫入。已發送給外部路由器的寫入無法由橋接器取消。

轉接器的 `push`／`replace` 必須：同步更新 `read()`；回傳一個在 `read()` 反映完成後才結束的 promise；或回傳 `void` 並透過 `subscribe` 確認該筆延遲寫入。通知必須描述當下 `read()` 回傳的位置。被拒絕的 promise 會透過 `console.error` 回報，並釋放下一個排隊的寫入。延遲的 `void` 寫入會在轉接器發布不同位置（例如重定向）時釋放，或在 2 秒內未獲確認時釋放（例如被路由器阻擋的導覽）。如果 promise 在 `read()` 反映新位置之前就結束，之後該位置的通知會被視為同一次寫入，而不是新的導覽。

---

## 元件整合：AutoMenu 與 AutoTabs

自訂延遲載入容器若需要在一般進入時等待該容器註冊並解析其 `defaultChild`，可將其子項宣告為 `{ id: "details", awaitRegistration: true }`。`AutoTabs` 會為具有巢狀 `children` 的項目自動設定這個旗標。這能避免在預設子節點確定之前就提交父層 URL。

### AutoMenu

`AutoMenu` 透過 `route` 屬性支援宣告式參與導覽樹：

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

- **單一路由層級**：選單在自身路由之下只增加一個路徑段。分組只用於組織條目，因此每個葉子都是直接子節點（`workspace:profile`，而非 `workspace:settings:profile`），這也是 id 必須在整個選單中唯一的原因。葉子會繼承其分組的 `disabled`、`hidden`、`roles` 與 `permissions`。
- **選取規則**：有 `route` 時，選取的條目是 id 為目前作用中路徑段的葉子；否則在 provider 內，選取的是 `target` 為目前路徑最長前綴的葉子。
- **`content`**：任一項目提供 `content` 時，`AutoMenu` 會將版面配置包進 `.auto-menu-container`，並把選取項目的內容掛載到 `.auto-menu-content`。若沒有任何項目定義 `content`，則渲染傳統的單一側欄元素。
- **`target`**：捷徑目標。點擊會呼叫 `nav.goto(target)`，不會在該項目下掛載內容。循環捷徑鏈（例如 `a -> b -> a`）會被偵測並阻止。

### AutoTabs

`AutoTabs` 支援由路由驅動的分頁切換：

```tsx
<AutoTabs
  route={{ name: "tabs", defaultChild: "basic" }}
  items={[
    { id: "basic", label: "Basic", content: <BasicTab /> },
    { id: "advanced", label: "Advanced", content: <AdvancedTab /> },
  ]}
/>
```

- **衝突策略**：`route` 與 `value` 互斥。提供 `route` 時應省略 `value`，因為 `AutoNavigation` 擁有選取權。若兩者同時提供，`route` 優先，並記錄開發警告 `RAC-TABS-ROUTE-VALUE`。
- **巢狀分頁**：子分頁相對於其父分頁路由解析，不會發生重複導覽。

---

## 核心 API 參考

### `createAutoNavigation(options)`

建立隔離的導覽引擎實例。

```ts
const nav = createAutoNavigation({
  initialPath: ["table", "local"],
  canAccess: (item) => true,
  readyTimeoutMs: 3000,
});
```

### `<AutoNavigationProvider>`

管理導覽生命週期的 React context provider。將前述任一框架 hook 回傳的轉接器傳給 `history`。權限透過 `AutoConfigProvider.config.canAccess` 設定；外部建立的導覽實例也會保留其工廠權限檢查器。

| 屬性            | 型別                          | 說明                                                                        |
| --------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `navigation`    | `AutoNavigation`              | 選填，預先建立好的導覽實例。                                                |
| `initialPath`   | `string \| readonly string[]` | 未提供 `navigation` 時的初始路徑。                                          |
| `history`       | `AutoHistoryAdapter`          | 選填的轉接器。省略即停用歷史同步。                                          |
| `initialParams` | `Record<string, string>`      | 未提供 `navigation` 時的初始參數。                                          |
| `hashSync`      | `boolean`                     | 已棄用的 hash 轉接器捷徑，預設 `false`。建議改用 `history={createHashHistory()}`。 |

### `useAutoRoute(config)`

宣告元件在導覽樹中的位置。

當初始路徑停在有可存取 `defaultChild` 的節點時，註冊會解析並將該子節點提交進實際路徑。歷史記錄對此正規化採用替換，因此顯示的子節點、URL 與路由 signal 保持一致，且不會額外新增記錄項目。

`setParams` 會合併參數補丁：省略的鍵保持不變，`null` 移除鍵，`""` 保留空值。有待處理導覽時，它會編輯目標參數並等待同一次導覽完成，而不是取消它。編輯傳入的歷史記錄目的地時，會在提交後替換其 URL。

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

為自訂版面配置元件提供明確的容器範圍：

```tsx
<AutoRouteScope path={["dashboard", "analytics"]}>
  <CustomMetricsPanel />
</AutoRouteScope>
```




