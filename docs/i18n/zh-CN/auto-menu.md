# AutoMenu

[English](../../auto-menu.md) | **简体中文** | [繁體中文](../zh-TW/auto-menu.md) | [日本語](../ja/auto-menu.md) | [한국어](../ko/auto-menu.md) | [Español](../es/auto-menu.md) | [Français](../fr/auto-menu.md) | [Deutsch](../de/auto-menu.md) | [Português (Brasil)](../pt-BR/auto-menu.md) | [Русский](../ru/auto-menu.md)

侧栏。条目可以嵌套、收成图标轨，并带图标、说明和徽章。它是导航，不是标签面板。面板用 [AutoTabs](auto-tabs.md)。


菜单项可设置 `tip: ReactNode`，悬停或聚焦时显示；嵌套项共用菜单的 tip 组件。折叠菜单在未设置 tip 时以标签作为提示。

优先级为：单项／字段／列参数 → 所属组件参数 → Provider 的组件默认配置（`config.tabs`、`config.form`、`config.table` 或 `config.menu`）→ 全局 `AutoConfigProvider.config.tipComponent` → 内置 `DefaultTip`。自定义组件接收 `{ content, children, placement }`（`AutoTipProps`），需保留触发元素的事件、ref 和无障碍属性。提示通过内部机制渲染；`DefaultTip` 已导出作为内置浮动兜底实现（通过 portal 显示，支持 Escape 关闭，触发元素位置不变）。

## 用法

```tsx
import { AutoMenu } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

<AutoMenu
  label="主导航"
  items={[
    { id: "inbox", label: "收件箱" },
    {
      id: "settings",
      label: "设置",
      children: [{ id: "profile", label: "资料" }],
    },
  ]}
  onChange={(id) => navigate(id)}
/>
```

## 行为与属性

| 属性 | 行为 |
| --- | --- |
| `items` | `id` 在整棵树里唯一。`hidden` 和 `canAccess` 不通过的条目会被丢掉。`children` 如果指回祖先，整支会被丢掉，避免坏 schema 无限递归。各条目可声明 `content` 在 `.auto-menu-content` 挂载业务内容，或配置 `target` 作为快捷入口。 |
| `route` | 可选 `AutoRouteConfig`（`{ name?: string, defaultChild?: string }`）。直接接入 [AutoNavigation](auto-navigation.md) 组件导航树；选中叶子自动触发 `goto`。 |
| `value` | 受控的选中叶子 id。省略则选择留在组件内部。 |
| `defaultValue` | 非受控的初始叶子。对不上叶子时，选中第一个可用叶子。 |
| `onChange(id, item, path)` | **不捕获。** `path` 是从根到叶子的 id 链。有 `children` 的父项只切换展开，不选中。 |
| `collapsible` | 默认 `false`。为 `true` 时，按钮可以收成图标轨。 |
| `collapsed` | 受控的图标轨。省略则用 `defaultCollapsed`（默认 `false`）。 |
| `onCollapsedChange` | **不捕获。** 参数是下一个布尔值。如果 `collapsed` 受控，你不更新它，图标轨就不会动。 |
| `disabled` | 禁用该项及其子孙。选择时会跳过禁用项。 |
| `label` | 分组标题，也是导航的无障碍名称。 |
| `header`、`footer` | 列表上下的插槽。 |
| `size`、`density` | 覆盖 provider。菜单先读 `config.menu`，再读全局尺寸和密度。 |

键盘移动留在菜单内。未配置 `route` 时，选中叶子本身不会跳转，`onChange` 是唯一信号；配置 `route` 或条目包含 `target` 时，点击条目自动在导航树中调用 `goto`。当任一条目包含 `content` 时，组件渲染为 `.auto-menu-container` 并附带 `.auto-menu-content` 内容区域；否则保留纯侧栏 `<nav>` 结构。

## 前置条件

入口引入一次 `style.css`（开发模式 `RAC-CSS-MISSING`）。`AutoConfigProvider` 可选。权限走 `config.canAccess`。组件树导航细节参见 [AutoNavigation](auto-navigation.md)。
