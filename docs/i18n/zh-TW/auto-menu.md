# AutoMenu

[English](../../auto-menu.md) | [简体中文](../zh-CN/auto-menu.md) | **繁體中文** | [日本語](../ja/auto-menu.md) | [한국어](../ko/auto-menu.md) | [Español](../es/auto-menu.md) | [Français](../fr/auto-menu.md) | [Deutsch](../de/auto-menu.md) | [Português (Brasil)](../pt-BR/auto-menu.md) | [Русский](../ru/auto-menu.md)

側欄。條目可以巢狀、收成圖示軌，並帶圖示、說明和徽章。它是導航，不是標籤面板。面板用 [AutoTabs](auto-tabs.md)。

## 用法

```tsx
import { AutoMenu } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

<AutoMenu
  label="主導航"
  items={[
    { id: "inbox", label: "收件箱" },
    {
      id: "settings",
      label: "設定",
      children: [{ id: "profile", label: "資料" }],
    },
  ]}
  onChange={(id) => navigate(id)}
/>
```

## 行為與屬性

| 屬性 | 行為 |
| --- | --- |
| `items` | `id` 在整棵樹裡唯一。`hidden` 和 `canAccess` 不通過的條目會被丟掉。`children` 如果指回祖先，整支會被丟掉，避免壞 schema 無限遞迴。 |
| `value` | 受控的選中葉子 id。省略則選擇留在元件內部。 |
| `defaultValue` | 非受控的初始葉子。對不上葉子時，選中第一個可用葉子。 |
| `onChange(id, item, path)` | **不捕獲。** `path` 是從根到葉子的 id 鏈。有 `children` 的父項只切換展開，不選中。 |
| `collapsible` | 預設 `false`。為 `true` 時，按鈕可以收成圖示軌。 |
| `collapsed` | 受控的圖示軌。省略則用 `defaultCollapsed`（預設 `false`）。 |
| `onCollapsedChange` | **不捕獲。** 引數是下一個布林值。如果 `collapsed` 受控，你不更新它，圖示軌就不會動。 |
| `disabled` | 停用該項及其子孫。選擇時會跳過停用項。 |
| `label` | 分組標題，也是導航的無障礙名稱。 |
| `header`、`footer` | 列表上下的插槽。 |
| `size`、`density` | 覆蓋 provider。選單先讀 `config.menu`，再讀全域性尺寸和密度。 |

鍵盤移動留在選單內。選中葉子本身不會跳轉；只有 `onChange` 是訊號。

## 前置條件

入口引入一次 `style.css`（開發模式 `RAC-CSS-MISSING`）。`AutoConfigProvider` 可選。許可權走 `config.canAccess`。
