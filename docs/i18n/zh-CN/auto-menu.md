# AutoMenu

[English](../../auto-menu.md) | **简体中文** | [繁體中文](../zh-TW/auto-menu.md) | [日本語](../ja/auto-menu.md) | [한국어](../ko/auto-menu.md) | [Español](../es/auto-menu.md) | [Français](../fr/auto-menu.md) | [Deutsch](../de/auto-menu.md) | [Português (Brasil)](../pt-BR/auto-menu.md) | [Русский](../ru/auto-menu.md)

侧栏。条目可以嵌套、收成图标轨，并带图标、说明和徽章。它是导航，不是标签面板。面板用 [AutoTabs](auto-tabs.md)。

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
| `items` | `id` 在整棵树里唯一。`hidden` 和 `canAccess` 不通过的条目会被丢掉。`children` 如果指回祖先，整支会被丢掉，避免坏 schema 无限递归。 |
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

键盘移动留在菜单内。选中叶子本身不会跳转；只有 `onChange` 是信号。

## 前置条件

入口引入一次 `style.css`（开发模式 `RAC-CSS-MISSING`）。`AutoConfigProvider` 可选。权限走 `config.canAccess`。
