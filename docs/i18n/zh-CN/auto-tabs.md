# AutoTabs

[English](../../auto-tabs.md) | **简体中文** | [繁體中文](../zh-TW/auto-tabs.md) | [日本語](../ja/auto-tabs.md) | [한국어](../ko/auto-tabs.md) | [Español](../es/auto-tabs.md) | [Français](../fr/auto-tabs.md) | [Deutsch](../de/auto-tabs.md) | [Português (Brasil)](../pt-BR/auto-tabs.md) | [Русский](../ru/auto-tabs.md)

标签页。嵌套标签是另一组由 `children` 喂给的 `AutoTabs`，不是菜单。侧栏用 [AutoMenu](auto-menu.md)。


每个 tab 可设置 `tip: ReactNode`，悬停或聚焦时显示浮层，不改变布局。`tipComponent` 可通过 AutoTabs 或单个 tab 传入，嵌套分组继承父组件配置。

优先级为：单项／字段／列参数 → 所属组件参数 → Provider 的组件默认配置（`config.tabs`、`config.form`、`config.table` 或 `config.menu`）→ 全局 `AutoConfigProvider.config.tipComponent` → 内置 `DefaultTip`。自定义组件接收 `{ content, children, placement }`（`AutoTipProps`），需保留触发元素的事件、ref 和无障碍属性。`AutoTip` 与 `DefaultTip` 均已导出；默认实现通过 portal 显示，支持 Escape 关闭，触发元素位置不变。


```tsx
import { AutoConfigProvider, AutoTabs, DefaultTip, type AutoTipProps } from "@zeroman.yang/react-auto-components";

function AppTip(props: AutoTipProps) {
  return <DefaultTip {...props} placement="bottom" />;
}

<AutoConfigProvider config={{ tipComponent: AppTip }}>
  <AutoTabs items={[{ id: "mock", label: "Mock", tip: "Runs in the browser" }]} />
</AutoConfigProvider>
```

## 用法

```tsx
import { AutoTabs } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

<AutoTabs
  items={[
    { id: "one", label: "其一", content: <p>第一页</p> },
    { id: "two", label: "其二", content: <p>第二页</p>, disabled: true },
  ]}
/>
```

## 行为与属性

| 属性 | 行为 |
| --- | --- |
| `items` | 每个标签要有稳定的 `id`。`hidden`（布尔或函数）以及 `canAccess` 不通过的标签会被去掉。 |
| `source` | 远程加载标签项：`({ signal }) => Promise<AutoTab[]>` 函数，或 `config.tabsSources` 的键。加载中显示状态行； rejection 显示 `error.message` 和重试按钮；未知键显示 `RAC-TABS-SOURCE`。`items` 和 `source` 只能提供一个；配合 `route` 时，加载完成的项会成为路由子节点。 |
| `route` | 可选 `AutoRouteConfig`（`{ name?: string, defaultChild?: string }`）。直接接入 [AutoNavigation](auto-navigation.md) 组件导航树；选中项由路由状态驱动，点击标签调用 `goto()`。 |
| `value` | 受控路径，从根开始的 id 列表。嵌套选择是 `["parent", "child"]`。与 `route` 互斥（`RAC-TABS-ROUTE-VALUE`）。 |
| `defaultValue` | 非受控的初始路径。 |
| `onChange(path, item)` | **不捕获。** 抛错时由 React 报告。受控模式下，你还没提交的路径保持上次的值。 |
| `mode` | 默认 `"horizontal"`。`"vertical"` 把标签竖排。 |
| `keepMounted` | 默认 `true`：未选中的面板仍挂载，局部状态还在。`false` 会卸载它们。 |
| `onRefresh` | 设置后，该标签显示刷新按钮。**不捕获。** |
| `loading` | 在标签文字后加省略号。不阻止选择。 |
| `size`、`density` | 覆盖 provider。标签先读 `config.tabs`，再读全局的 size 和 density。 |
| `disabled` | 标签仍可见，但不能选。默认选中会跳过禁用标签。 |
| `closable` | 分组提供了 `onClose` 时显示关闭按钮。焦点在该标签上时，Delete 也会请求关闭。 |
| `onClose(path, item)` | 请调用方移除这个标签。**不捕获。** 嵌套组上报完整路径。调用方自己更新 `items`。 |
| `lazy` | 默认 `false`。`true` 在第一次打开时才挂载面板。 |
| `actions` | 标签栏右侧的操作按钮区域。 |
| `extra` | 标签栏右侧的自定义扩展内容。 |
| `tabActions` | 标签页右键菜单动作集合。菜单项支持 `icon` 图标、`danger` 危险色、`separator` 分隔线、`disabled` 与 `hidden`，与表格行操作一致。省略则不启用右键菜单。 |

某一项如果有 `children`，就用嵌套标签代替 `content`。`defaultActive` 是嵌套层的非受控 id。

当水平标签栏超出容器宽度时，两端会自动出现平滑滚动按钮。滚动到达两端边界时按钮自动禁用，原生滚动条保持隐藏，切换选中项时会自动平滑滚动确保激活项可见。

当提供 `route` 时，由 `AutoNavigation` 全权接管当前选中的标签。使用 `route` 时应省略 `value`；若两者同时传入，`route` 优先并打印开发警告 `RAC-TABS-ROUTE-VALUE`。

## 动态标签

`useAutoTabsWorkspace` 在没有路由器的情况下维护一组页面。把 `tabsProps` 传给 `AutoTabs`。`open` 会新增页面；如果这个 id 已经打开，就切过去并保留草稿。

```tsx
import {
  AutoTabs,
  useAutoTabsWorkspace,
} from "@zeroman.yang/react-auto-components";

const pages = {
  home: { title: "工作台", render: () => <p>固定标签</p> },
  order: {
    title: "订单",
    render: ({ tab, setState }) => (
      <input
        aria-label="草稿"
        value={typeof tab.state === "string" ? tab.state : ""}
        onChange={(event) => setState(event.target.value)}
      />
    ),
  },
};

export function Orders() {
  const workspace = useAutoTabsWorkspace({
    workspaceId: "orders",
    pages,
    defaultTabs: [{ id: "home", page: "home", pinned: true }],
  });
  return (
    <>
      <button
        type="button"
        disabled={!workspace.ready}
        onClick={() =>
          workspace.open({
            id: "order:1",
            page: "order",
            title: "订单 1",
            params: { orderId: "1" },
          })
        }
      >
        打开订单
      </button>
      {workspace.ready && <AutoTabs {...workspace.tabsProps} />}
    </>
  );
}
```

固定标签没有关闭按钮。关掉当前标签时，会选中下一个可用的邻居。`beforeClose` 返回 `false` 或抛错都会取消关闭。关闭按钮上的抛错会通过 `config.notify` 显示。标签、选中项、`params` 和 `state` 在挂载后从 `sessionStorage` 恢复。等到 `ready` 再调用 `open`。`storage: false` 只放在内存里。`"local"` 或存储适配器可以选择别的存储。键是 `${namespace}:tabs:${workspaceId}`。

`tabsProps` 会打开 `lazy` 和 `keepMounted`：面板第一次访问时挂载，之后保持挂载。组件不会自己删标签。`onClose` 请工作区移除它。

## 前置条件

入口引入一次 `style.css`（开发模式 `RAC-CSS-MISSING`）。`AutoConfigProvider` 可选。
