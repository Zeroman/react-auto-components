# AutoNavigation とコンポーネントツリーナビゲーション

[English](../../auto-navigation.md) | [简体中文](../zh-CN/auto-navigation.md) | [繁體中文](../zh-TW/auto-navigation.md) | **日本語** | [한국어](../ko/auto-navigation.md) | [Español](../es/auto-navigation.md) | [Français](../fr/auto-navigation.md) | [Deutsch](../de/auto-navigation.md) | [Português (Brasil)](../pt-BR/auto-navigation.md) | [Русский](../ru/auto-navigation.md)

React Auto Components は、コンポーネント自身がナビゲーションツリーに直接参加するツリー構造のナビゲーションシステムを提供します。位置、パラメータ、アクセス権限、URL 履歴を分離します。

---

## 2 つの統合レベル

アーキテクチャに最も合う統合レベルを選んでください。

### レベル 1: 軽量なルーター統合（プロバイダ不要）

アプリケーションが既に外部ルーター（React Router、TanStack Router、Next.js など）を使っていて、`AutoMenu` や `AutoTabs` が現在の URL を反映・制御できればよい場合は、標準の制御付き `value` と `onChange` props を直接使ってください。

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

**レベル 1 を使う場面:**

- トップレベルのページ切り替えを外部ルーターだけで管理する。
- 入れ子になったコンポーネントツリーの位置探索が不要。
- コンポーネントスコープの `useAutoRoute` フック、abort シグナル、非同期の遅延マウント待機プロトコルが不要。

---

### レベル 2: コンポーネントツリーナビゲーション（`AutoNavigation` + 履歴アダプター）

レベル 2 はコンポーネント階層をそのまま生きた宣言的ナビゲーションツリーに変えます。ナビゲーション対象は構造化されたパス（例: `workspace:projects:details` や `["workspace", "projects", "details"]`）で、パラメータはパス構造から分離され、React の内外どちらでもシームレスに動きます。

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

**レベル 2 を使う場面:**

- 相対ナビゲーション（`./child`、`../sibling`）が必要な深く入れ子になったコンポーネントツリー。
- 分離されたパラメータ（`params: { projectId: "42", tab: "audit" }`）。
- `goto` が遷移を確定する前に子ノードの登録を待つ、非同期の遅延コンポーネントマウント。
- 細かい権限調整（`canAccess`、`roles`、`permissions`、`disabled`、`hidden`）。対象が禁止されたりアンマウントされたりすると URL を自動的に修正します。
- React 18/19 の StrictMode 二重マウントに耐える、組み込みの `AbortSignal` 管理。

---

## 公式フレームワークアダプターの例

`AutoNavigation` を外部フレームワークルーターと同期するには（レベル 2）、`read()`、`push()`、`replace()`、`subscribe()` を持つ `AutoHistoryAdapter` を実装します。

> **重要**: カスタムアダプターは、クロージャーの stale 化を避けるために ref 経由で最新のルーター位置を読むべきです。また、位置の更新のたびに同期リスナーを作り直してはいけません。そうしないと保留中の遅延ナビゲーションが中断されることはありません。

エフェクトは `onChange(location, { type: "snapshot" })` で現在の URL を通知します。これには初回実行と StrictMode の再実行も含まれます。変わらないスナップショットは子の保留中のナビゲーションを中断しません。変わったスナップショットは、前にコミットされたルートへの巻き戻しも含めて、引き続きナビゲーションします。URL が変わらない場合でも、既知の外部ナビゲーション意図には `{ type: "navigation" }` を使ってください。位置のみの通知は既存のナビゲーション意味論を維持します（書き込みエコーの検出付き）。そのため、初回スナップショットを再生する既存アダプターは、このメタデータを追加するか、その再生を自分で抑制する必要があります。

置き換えられた遅延 `void` 書き込みについて、ブリッジはその行き先を覚えていて、遅い確認応答を最新の意図された URL へ修正します。アダプターがその書き込みを完全に放棄した場合、同じ行き先の後続スナップショットはその確認応答と区別できません。その場合は既知の外部ナビゲーションとして `{ type: "navigation" }` を通知してください。それは引き続き権威となります。

### 1. React Router（v6 / v7）

[useLocation](https://reactrouter.com/api/hooks/useLocation) と [useNavigate](https://reactrouter.com/api/hooks/useNavigate) を使って React Router と統合します。

splat / キャッチオールルート（例: `<Route path="workspace/*" element={<App />} />`）でルーターを設定すると、入れ子のコンポーネントパスが意図しない 404 なしで処理されます。

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

[useLocation](https://tanstack.com/router/latest/docs/framework/react/api/router/useLocationHook) と [useNavigate](https://tanstack.com/router/latest/docs/framework/react/api/router/useNavigateHook) を使って TanStack Router と統合します。

動的なコンポーネントパスを受け取るには、TanStack のキャッチオールファイルルート（例: `_layout/$` や `routes/workspace.$`）を使います。

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

### 3. Next.js App Router（'use client'）

[useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)、[usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname)、[useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params) を使って Next.js App Router と統合します。

> **Next.js の注意点**:
>
> 1. 静的レンダリングの App Router ルートでは、`useSearchParams()` を読むクライアントコンポーネントを `<Suspense>` で囲んでください。本番ビルドにはこの境界が必要です。動的レンダリングの代替案はリンク先の Next.js ドキュメントを参照してください。
> 2. オプションのキャッチオールルート `app/[[...slug]]/page.tsx` を定義すると、複数セグメントのコンポーネントパスが 404 なしで解決されます。

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

## 組み込みの履歴アダプター

スタンドアロンアプリケーション、GitHub Pages、Node／テスト環境向けに、3 つの組み込みアダプターが用意されています。

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

### URL コーデック

すべてのアダプターは `encodeLocation(loc, basePath, separator)` と `decodeLocation(url, basePath)` を使います。

- ハッシュ URL はセグメントを `:` で連結します（`#/table:local`）。ブラウザー URL は `/` で連結します（`/app/table/local`）。デコードはどちらのセパレーターも受け付けます。
- 空のパスでもパラメータを持てます: `?tab=a` と `#/?tab=a` は `{ path: [], params: { tab: "a" } }` にデコードされます。
- `basePath` はセグメント境界でのみ一致します: `basePath: "/admin"` の場合、`/admin/users` は `["users"]` にデコードされますが、`/administrator` はこのナビゲーションの外で、空の位置としてデコードされます。
- Unicode のパスとパラメータのキー／値は `encodeURIComponent` で問題なくエスケープされます。
- 空のパラメータ文字列（例: `{ query: "" }`）は破棄されず `?query=` として保持されます。
- コロン、スラッシュ、クエリ記号を含むセグメントは確実にエンコードされます。

---

## 履歴同期（`syncHistory`）

`syncHistory(navigation, adapter)` は `AutoNavigation` インスタンスを `AutoHistoryAdapter` に接続します。

- **中間パスの分離**: 遅延読み込みの子へ遷移するとき、中間のルート状態は未完成の URL を書かずに React マウントを起こします。履歴に書き込むのはコミット済みナビゲーション（`subscribeCommit`）だけです。
- **エコー防止**: 外部 URL 変化から始まったナビゲーションは `source: "history"` を持ちます。そのコミットイベントがアダプターへエコーされることはありません。
- **遷移の同一性**: 拒否または禁止された外部ナビゲーションは最も近い有効なルートへ調整され、`adapter.replace()` を呼びます。古い失敗したナビゲーションが新しいユーザーナビゲーションを上書きすることはありません。
- **初期同期**: コミット済み位置と異なる空でない URL はそこへ遷移します。空の URL は `adapter.replace()` でコミット済み位置を受け取ります。既に一致する URL はそのままなので、アダプターを作り直しても（例えば `history={createHashHistory()}` をインラインで書いても）保留中のナビゲーションはキャンセルされません。
- **既定子 URL**: 履歴の行き先が既定の子へ解決されるとき、確定したパスが不完全な URL をパラメータと履歴エントリを保ったまま置き換えます。
- **非同期書き込み**: 書き込みは順番に実行されます。新しいコミットは、より前の書き込みが終わってから初めて `read()` と比較されるため、元の URL へ戻ることは失われません。既に観測済みの URL への遅延通知は、より新しい遅延ナビゲーションをキャンセルしません。コミット済みルートへの実際の履歴変化は、保留中の処理をキャンセルします。
- **クリーンアップ**: リスナーを切断しキューの書き込みを破棄する、購読解除関数を返します。外部ルーターへ既に発行された書き込みはブリッジではキャンセルできません。

アダプターの `push`／`replace` は、`read()` を同期的に更新するか、`read()` が完了を反映した後に解決する promise を返すか、`void` を返して `subscribe` で遅延書き込みを確認応答するかのいずれかでなければなりません。通知は `read()` が現時点で返す位置を述べなければなりません。拒否された promise は `console.error` で報告され、次のキューの書き込みを解放します。遅延 `void` 書き込みは、アダプターが別の位置（例えばリダイレクト）を通知したとき、または確認応答なく 2 秒後（ルーターにブロックされたナビゲーションなど）に解放されます。promise が `read()` の反映前に解決した場合、その位置の後続の通知は新しいナビゲーションではなく同じ書き込みとして扱われます。

---

## コンポーネント統合: AutoMenu と AutoTabs

カスタムの遅延コンテナでは、通常のエントリがそのコンテナの登録と `defaultChild` の解決を待たせる必要があるとき、子を `{ id: "details", awaitRegistration: true }` と宣言します。`AutoTabs` は入れ子の `children` を持つ項目にこれを自動的に設定します。これにより、既定の子が判明する前に親 URL がコミットされるのを防ぎます。

### AutoMenu

`AutoMenu` は `route` prop を通じてナビゲーションツリーへの宣言的な参加をサポートします。

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

- **1 ルートレベル**: メニューは自分のルートの下にちょうど 1 セグメントを追加します。グループは項目を整理するだけなので、すべての葉は直接の子です（`workspace:settings:profile` ではなく `workspace:profile`）。だからこそ id はメニュー全体で一意でなければなりません。葉はグループの `disabled`、`hidden`、`roles`、`permissions` を継承します。
- **選択**: `route` があるとき、選択されるエントリは id がアクティブな子セグメントである葉です。プロバイダ内では、現在のパスの最長の前置である `target` を持つ葉です。
- **`content`**: いずれかの項目で指定すると、`AutoMenu` はレイアウトを `.auto-menu-container` で包み、選択された項目のコンテンツを `.auto-menu-content` にマウントします。`content` を定義する項目がなければ、従来の単一サイドバー要素が描画されます。
- **`target`**: ショートカットの宛先です。クリックすると `nav.goto(target)` を呼び、その項目の下にコンテンツをマウントしません。循環するショートカットチェーン（例: `a -> b -> a`）は検出されて防がれます。

### AutoTabs

`AutoTabs` はルート駆動のタブ切り替えをサポートします。

```tsx
<AutoTabs
  route={{ name: "tabs", defaultChild: "basic" }}
  items={[
    { id: "basic", label: "Basic", content: <BasicTab /> },
    { id: "advanced", label: "Advanced", content: <AdvancedTab /> },
  ]}
/>
```

- **競合ポリシー**: `route` と `value` は相互排他です。`route` を指定したら `value` は省くべきです。`AutoNavigation` が選択を管理するためです。両方を渡すと `route` が優先され、開発警告 `RAC-TABS-ROUTE-VALUE` が記録されます。
- **入れ子のタブ**: 子タブは二重ナビゲーションなしに、親タブルートからの相対で解決されます。

---

## コア API リファレンス

### `createAutoNavigation(options)`

分離されたナビゲーションエンジンのインスタンスを作成します。

```ts
const nav = createAutoNavigation({
  initialPath: ["table", "local"],
  canAccess: (item) => true,
  readyTimeoutMs: 3000,
});
```

### `<AutoNavigationProvider>`

ナビゲーションのライフサイクルを管理する React コンテキストプロバイダ。上のフレームワークフックが返すアダプターを `history` に渡してください。権限は `AutoConfigProvider.config.canAccess` で設定します。外部で作成されたナビゲーションインスタンスも、ファクトリの権限チェッカーを保持します。

| Prop            | 型                            | 説明                                                                                       |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| `navigation`    | `AutoNavigation`              | 任意。事前作成済みのナビゲーションインスタンス。                                           |
| `initialPath`   | `string \| readonly string[]` | `navigation` を省いた場合の初期パス。                                                      |
| `history`       | `AutoHistoryAdapter`          | 任意のアダプター。省くと履歴同期を無効にします。                                           |
| `initialParams` | `Record<string, string>`      | `navigation` を省いた場合の初期パラメータ。                                                |
| `hashSync`      | `boolean`                     | 非推奨のハッシュアダプターショートカット。既定 `false`。`history={createHashHistory()}` を推奨。 |

### `useAutoRoute(config)`

コンポーネントのナビゲーションツリーへの参加を宣言します。

初期パスがアクセス可能な `defaultChild` を持つノードで終わるとき、登録は解決し、その子を実際のパスへコミットします。履歴はこの正規化に置換を使うため、表示される子、URL、ルートシグナルが、エントリを追加せず一致します。

`setParams` はパラメータのパッチをマージします。省かれたキーは変わらず、`null` はキーを削除し、`""` は空の値を保ちます。保留中のナビゲーションの間は、行き先のパラメータを編集し、そのナビゲーションをキャンセルせずに待ちます。届いた履歴の行き先を編集すると、コミット時にその URL を置き換えます。

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

カスタムレイアウトコンポーネント向けの明示的なコンテナスコープです。

```tsx
<AutoRouteScope path={["dashboard", "analytics"]}>
  <CustomMetricsPanel />
</AutoRouteScope>
```
