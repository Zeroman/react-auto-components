# AutoTabs

[English](../../auto-tabs.md) | [简体中文](../zh-CN/auto-tabs.md) | **繁體中文** | [日本語](../ja/auto-tabs.md) | [한국어](../ko/auto-tabs.md) | [Español](../es/auto-tabs.md) | [Français](../fr/auto-tabs.md) | [Deutsch](../de/auto-tabs.md) | [Português (Brasil)](../pt-BR/auto-tabs.md) | [Русский](../ru/auto-tabs.md)

標籤頁。巢狀標籤是另一組由 `children` 餵給的 `AutoTabs`，不是選單。側欄用 [AutoMenu](auto-menu.md)。

## 用法

```tsx
import { AutoTabs } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

<AutoTabs
  items={[
    { id: "one", label: "其一", content: <p>第一頁</p> },
    { id: "two", label: "其二", content: <p>第二頁</p>, disabled: true },
  ]}
/>
```

## 行為與屬性

| 屬性 | 行為 |
| --- | --- |
| `items` | 每個標籤要有穩定的 `id`。`hidden`（布林或函式）以及 `canAccess` 不通過的標籤會被去掉。 |
| `value` | 受控路徑，從根開始的 id 列表。巢狀選擇是 `["parent", "child"]`。 |
| `defaultValue` | 非受控的初始路徑。 |
| `onChange(path, item)` | **不捕獲。** 拋錯時由 React 報告。受控模式下，你還沒提交的路徑保持上次的值。 |
| `mode` | 預設 `"horizontal"`。`"vertical"` 把標籤豎排。 |
| `keepMounted` | 預設 `true`：未選中的面板仍掛載，區域性狀態還在。`false` 會解除安裝它們。 |
| `onRefresh` | 設定後，該標籤顯示重新整理按鈕。**不捕獲。** |
| `loading` | 在標籤文字後加省略號。不阻止選擇。 |
| `size`、`density` | 覆蓋 provider。標籤先讀 `config.tabs`，再讀全域性的 size 和 density。 |
| `disabled` | 標籤仍可見，但不能選。預設選中會跳過停用標籤。 |

某一項如果有 `children`，就用巢狀標籤代替 `content`。`defaultActive` 是巢狀層的非受控 id。

## 前置條件

入口引入一次 `style.css`（開發模式 `RAC-CSS-MISSING`）。`AutoConfigProvider` 可選。

## 動態標籤

`useAutoTabsWorkspace` 在沒有路由器時維護一組頁面。把 `tabsProps` 傳給 `AutoTabs`。同一個 id 再次 `open` 只會切到該標籤並保留草稿。固定標籤不能關閉。等到 `ready` 再呼叫 `open`。選中項、`params` 和 `state` 會在掛載後從 `sessionStorage` 恢復。`beforeClose` 回傳 `false` 或拋錯都會取消關閉。示範見 [AutoTabs 頁](../../../test-project/src/examples/DynamicTabsDemo.tsx)。
