# AutoNavigation 与组件导航树

[English](../../auto-navigation.md) | **简体中文**

React Auto Components 提供了基于组件树的导航系统，让各组件直接参与导航树拓扑结构，并将组件位置、参数、访问权限以及 URL 历史解耦。

---

## 两种接入档位

根据业务架构需求选择适用的接入方式：

### 第一档：轻量级路由对接（无需 Provider）

如果项目中已有成熟的外部路由（例如 React Router、TanStack Router 或 Next.js），仅需使用 `AutoMenu` 或 `AutoTabs` 展示侧栏/标签页，可直接使用它们原有的受控属性 `value` 和 `onChange`：

```tsx
import { AutoMenu } from "@zeroman.yang/react-auto-components";
import { useLocation, useNavigate } from "react-router-dom";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentId = location.pathname.slice(1) || "overview";

  return (
    <AutoMenu
      items={[
        { id: "overview", label: "概览" },
        { id: "users", label: "用户" },
        { id: "settings", label: "设置" },
      ]}
      value={currentId}
      onChange={(id) => navigate(`/${id}`)}
    />
  );
}
```

**适用场景：**

- 顶层页面切换完全由外部路由管理。
- 无需组件树层级定位与相对跳转。
- 不需要组件级 `useAutoRoute`、自动请求取消信号（AbortSignal）或懒加载挂载就绪等待。

---

### 第二档：组件树导航（`AutoNavigation` + 历史适配器）

第二档将组件层级构造成动态、声明式的导航树。目标路径采用结构化命名（例如 `workspace:projects:details` 或 `["workspace", "projects", "details"]`），支持参数与路径分离，可在 React 树内或脱离 React 独立驱动。

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
    // 导航切换或组件卸载时 signal 会被自动 abort
    fetch(`/api/projects/${encodeURIComponent(params.projectId)}`, { signal })
      .then((res) => res.json())
      .then(setData)
      .catch((error) => {
        if (!signal.aborted) setData({ error: String(error) });
      });
  }, [params.projectId, signal]);

  return (
    <div>
      <h3>项目：{params.projectId}</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={() => goto("./team")}>查看团队</button>
      <button onClick={() => goto("../list")}>返回列表</button>
    </div>
  );
}
```

**适用场景：**

- 深度嵌套组件，需要相对路径跳转（`./child`、`../sibling`）。
- 独立的路径与查询参数（`params: { projectId: "42", tab: "audit" }`）。
- 异步懒加载组件挂载协议，`goto` 会等待子节点注册就绪后再完成转场。
- 细粒度权限对齐（`canAccess`、`roles`、`permissions`、`disabled`、`hidden`），当节点被禁用或撤权时自动纠正回退。
- 内置 `AbortSignal` 管理，兼顾 React 18/19 StrictMode 挂载重放机制。

---

## 官方框架适配范例

为了让第二档的 `AutoNavigation` 与外部框架路由联动，只需实现 `AutoHistoryAdapter` 接口中的 `read()`、`push()`、`replace()` 和 `subscribe()`。

> **核心原则**：适配器使用 React Hook 配合 Ref 读取最新路由状态，避免闭包陈旧；同时不得在每次路由变动时重建同步监听，以免打断正在等待懒加载就绪的转场。

Effect 通过 `onChange(location, { type: "snapshot" })` 发布当前 URL，包括首次执行和 StrictMode 重放。未变化的快照不会打断子组件正在等待的导航；变化后的快照仍会触发导航，包括后退到上一个已提交路径。已知的外部导航意图使用 `{ type: "navigation" }`，即使 URL 没有变化也会生效。仅传位置的通知保留原有导航语义（包含写入回声识别），因此会重放初始快照的现有适配器应添加此元数据，或自行跳过该重放。

异步返回 `void` 的写入被其他导航取代后，同步层会记住其目标，并将迟到的回声纠正到最新目标。如果适配器彻底放弃了该写入，之后同地址的快照与迟到回声无法区分；这种已知的外部导航应发布 `{ type: "navigation" }`，确保它具有优先权。

### 1. React Router (v6 / v7)

基于官方 Hook [useLocation](https://reactrouter.com/api/hooks/useLocation) 与 [useNavigate](https://reactrouter.com/api/hooks/useNavigate) 对接。

在 React Router 中建议配置通配符路由（例如 `<Route path="workspace/*" element={<App />} />`），以确保多层级组件路由能被正确捕获而不会误报 404。

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

  // decodeLocation 只在路径段边界上剥离 basePath（"/admin" 不会匹配 "/administrator"）。
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

  // 当外部/前进/后退触发 URL 变动时通知适配器订阅者
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

基于官方 Hook [useLocation](https://tanstack.com/router/latest/docs/framework/react/api/router/useLocationHook) 与 [useNavigate](https://tanstack.com/router/latest/docs/framework/react/api/router/useNavigateHook) 对接。

在 TanStack Router 中建议配置通配文件路由（如 `_layout/$`）以匹配动态组件路径。

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

  // 路由变化时通知适配器订阅者
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

基于官方 Hook [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)、[usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname) 与 [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params) 对接。

> **Next.js 注意事项**：
>
> 1. 对静态渲染的 App Router 路由，应将调用 `useSearchParams()` 的客户端组件包在 `<Suspense>` 中，生产构建需要此边界；动态渲染的替代方式见前述 Next.js 官方文档。
> 2. 可配置可选全捕获路由 `app/[[...slug]]/page.tsx` 承载深层多段组件路径。

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

  // 响应式监听 Next 路由变化
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

## 内置历史适配器

针对独立部署、GitHub Pages 静态托管或 Node.js 单测环境，库内提供了三个内置适配器：

```tsx
import {
  createHashHistory,
  createBrowserHistory,
  createMemoryHistory,
} from "@zeroman.yang/react-auto-components";

// 1. Hash 路由（适合 GitHub Pages / 静态托管）
const hashHistory = createHashHistory({ basePath: "" });

// 2. HTML5 pushState 路由（标准 SPA 部署）
const browserHistory = createBrowserHistory({ basePath: "/app" });

// 3. 内存路由（无浏览器环境、SSR、单测）
const memoryHistory = createMemoryHistory({
  path: ["table", "local"],
  params: {},
});
memoryHistory.push({ path: ["table", "large"], params: {} });
memoryHistory.back();
```

### URL 编解码

适配器均基于 `encodeLocation(loc, basePath, separator)` 和 `decodeLocation(url, basePath)`：

- Hash 地址用 `:` 连接路径段（`#/table:local`），浏览器地址用 `/` 连接（`/app/table/local`）。解码时两种分隔符都接受。
- 空路径仍可携带参数：`?tab=a` 和 `#/?tab=a` 均解码为 `{ path: [], params: { tab: "a" } }`。
- `basePath` 只在路径段边界上匹配：设置 `basePath: "/admin"` 时，`/admin/users` 解码为 `["users"]`；`/administrator` 不属于这个导航，解码为空位置。
- Unicode 字符及特殊参数键值由 `encodeURIComponent` 严格转义。
- 保留空字符串参数（例如 `{ query: "" }` 编码为 `?query=`），与缺少参数的语义清晰分离。
- 安全处理嵌入冒号、斜杠或问号的路径片段。

---

## 历史同步机制（`syncHistory`）

`syncHistory(navigation, adapter)` 将 `AutoNavigation` 实例与 `AutoHistoryAdapter` 建立双向同步：

- **中间路径隔离**：当跳转到深层懒加载组件时，中间路由状态仅通知 React 渲染父层容器，不写入 URL；只有最终完成提交的事件（`subscribeCommit`）才会写入历史。
- **防止回环反写**：从外部 URL 触发的导航带有 `source: "history"`，在提交时跳过反写回 adapter。
- **转场身份校验**：如果外部历史跳转到不存在或被禁用的路径，会触发对齐并调用 `adapter.replace()` 进行纠偏；过时的失败不会覆盖用户在此期间触发的更新导航。
- **初始同步**：URL 非空且与已提交位置不同时，导航到 URL 指向的位置；URL 为空时，用 `adapter.replace()` 写入已提交位置；两者一致时不做任何事。因此重新创建适配器（例如内联写 `history={createHashHistory()}`）不会取消正在等待的导航。
- **默认子项地址**：历史导航目标解析到默认子项时，用最终完整路径替换原有的不完整 URL，同时保留参数和当前历史条目。
- **异步写入**：按顺序执行写入，前一次完成后才用 `read()` 判断下一次是否重复，避免返回原地址的操作被丢弃。已经观察过的地址即使迟到通知，也不会取消新的懒加载导航；真实后退到已提交路径仍会取消等待中的跳转。
- **完整销毁**：返回注销函数，清理订阅并丢弃排队中的写入。已经交给外部 Router 执行的写入无法由同步层撤销。

适配器的 `push`/`replace` 需要满足以下一种方式：同步更新 `read()`；返回一个在 `read()` 已反映完成结果后才结束的 Promise；或返回 `void`，并在延迟写入完成后通过 `subscribe` 通知。通知的位置应与当时的 `read()` 一致。Promise 拒绝会通过 `console.error` 报告，并释放后续写入。延迟的 `void` 写入在适配器发布了另一个位置（例如重定向）时，或 2 秒内未收到确认时（例如被 Router 拦截的导航）会被释放。如果 Promise 早于 `read()` 反映新位置就已结束，之后该位置的通知会被视为同一次写入，而不是新的导航。

---

## 组件适配：AutoMenu 与 AutoTabs

自定义懒加载容器若需要在普通进入时等待注册并解析 `defaultChild`，可把子项声明为 `{ id: "details", awaitRegistration: true }`。`AutoTabs` 会为带嵌套 `children` 的标签自动设置该标志，避免默认子项尚未确定就提交父级地址。

### AutoMenu

`AutoMenu` 可通过 `route` 属性直接加入导航树：

```tsx
<AutoMenu
  route={{ name: "workspace", defaultChild: "projects" }}
  items={[
    {
      id: "projects",
      label: "项目列表",
      content: <ProjectsView />, // 选中时挂载业务内容
    },
    {
      id: "settings",
      label: "设置",
      children: [
        { id: "profile", label: "个人资料", content: <ProfileView /> }, // 路径：workspace:profile
      ],
    },
    {
      id: "docs-link",
      label: "使用文档",
      target: "workspace:docs:guide", // 快捷入口：点击触发 goto，不重复挂载内容
    },
  ]}
/>
```

- **只占一层路由**：菜单在自身路由下只增加一个路径段。分组只用于组织条目，每个叶子都是直接子节点（`workspace:profile`，而不是 `workspace:settings:profile`），所以 id 必须在整个菜单内唯一。叶子会继承所在分组的 `disabled`、`hidden`、`roles` 和 `permissions`。
- **选中规则**：配置了 `route` 时，选中 id 等于当前子路径段的叶子；没有 `route` 但处于 Provider 内时，选中 `target` 是当前路径最长前缀的叶子。
- **`content`**：条目配置了 `content` 时，`AutoMenu` 自动使用 `.auto-menu-container` 布局，并在 `.auto-menu-content` 内展示选中条目的内容。若所有条目均无 `content`，则保留原有的纯侧栏结构。
- **`target`**：快捷跳转目标。点击时直接调用 `nav.goto(target)`，不会在原地挂载内容。内置防死循环守卫，避免 `a -> b -> a` 造成循环挂死。

### AutoTabs

`AutoTabs` 支持由路由驱动标签切换：

```tsx
<AutoTabs
  route={{ name: "tabs", defaultChild: "basic" }}
  items={[
    { id: "basic", label: "基础用法", content: <BasicTab /> },
    { id: "advanced", label: "高级用法", content: <AdvancedTab /> },
  ]}
/>
```

- **冲突策略**：`route` 与 `value` 互斥。当配置了 `route` 时，应省略 `value`（由 `AutoNavigation` 全权接管）。若两者同时传入，`route` 优先并打印开发警告 `RAC-TABS-ROUTE-VALUE`。
- **嵌套标签**：子标签会相对于父级路径解析，点击子标签只触发一次导航，避免父级重复触发将子状态重置。

---

## 核心 API

### `createAutoNavigation(options)`

创建独立的导航引擎实例。

```ts
const nav = createAutoNavigation({
  initialPath: ["table", "local"],
  canAccess: (item) => true,
  readyTimeoutMs: 3000,
});
```

### `<AutoNavigationProvider>`

将前述任一框架 hook 返回的适配器传入 `history`。权限通过 `AutoConfigProvider.config.canAccess` 配置；外部创建的导航实例同时保留其工厂权限检查。

管理导航实例生命周期的 React 上下文 Provider。

| 属性            | 类型                          | 说明                               |
| --------------- | ----------------------------- | ---------------------------------- |
| `navigation`    | `AutoNavigation`              | 可选，外部创建好的导航实例。       |
| `initialPath`   | `string \| readonly string[]` | 未提供 `navigation` 时的初始路径。 |
| `history`       | `AutoHistoryAdapter`          | 可选适配器；省略时不进行历史同步。 |
| `initialParams` | `Record<string, string>`      | 未提供 `navigation` 时的初始参数。 |

### `useAutoRoute(config)`

在组件内声明自己在导航树中的位置：

初始路径停在配置了可访问 `defaultChild` 的节点时，节点注册后会将默认子项补入实际路径并提交。同步到历史记录时使用替换，使显示内容、URL 和路由 signal 保持一致，不额外增加记录。

`setParams` 合并参数补丁：未提供的键保持不变，`null` 删除键，`""` 保留空值。存在进行中的导航时，它修改目标参数并等待同一次导航完成，不会取消跳转。修改来自历史记录的待完成目标时，会在提交后替换其 URL。

```ts
await setParams({ filter: null, query: "" });
```

```ts
const {
  nodePath, // 当前节点的结构路径
  activeChild, // 当前处于激活状态的子节点 ID
  activeSubpath, // 当前节点之后的剩余路径
  params, // 当前参数对象
  signal, // AbortSignal，当参数/路径变更或组件卸载时取消
  goto, // 相对于当前节点进行导航
  replace, // 相对于当前节点替换导航
  setParams, // 更新参数
} = useAutoRoute({
  name: "settings",
  defaultChild: "profile",
  children: ["profile", "security"],
});
```

### `<AutoRouteScope>`

用于自定义容器组件明确嵌套导航路径：

```tsx
<AutoRouteScope path={["dashboard", "analytics"]}>
  <CustomMetricsPanel />
</AutoRouteScope>
```
