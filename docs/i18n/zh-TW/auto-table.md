# AutoTable

[English](../../auto-table.md) | [简体中文](../zh-CN/auto-table.md) | **繁體中文** | [日本語](../ja/auto-table.md) | [한국어](../ko/auto-table.md) | [Español](../es/auto-table.md) | [Français](../fr/auto-table.md) | [Deutsch](../de/auto-table.md) | [Português (Brasil)](../pt-BR/auto-table.md) | [Русский](../ru/auto-table.md)

本地或遠端資料的表格，帶排序、篩選、選擇、可選虛擬滾動，以及增刪改彈窗。搜尋欄位遵循 [AutoSearch](auto-search.md)。新增和編輯彈窗遵循 [AutoDialog](auto-dialog.md) 與 [AutoForm](auto-form.md)。

`data`、`dataSource`、`source` 只能提供一個；同時傳入是型別錯誤。

## 用法

```tsx
import { AutoTable } from "@zeroman.yang/react-auto-components";
import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx";
import "@zeroman.yang/react-auto-components/style.css";

<AutoTable
  id="orders"
  rowKey="id"
  data={rows}
  columns={[{ key: "id", label: "編號" }]}
  exportXlsx={exportXlsx}
/>
```

`exportXlsx` 來自 `@zeroman.yang/react-auto-components/xlsx`，不是主入口。`exceljs` 是可選依賴，缺失時為 `RAC-XLSX-DEP`。

## 行為與屬性

| 屬性 | 行為 |
| --- | --- |
| `id` | 必填。設定鍵是 `${namespace}:table:${id}`。空 id 警告 `RAC-TABLE-ID`。 |
| `rowKey` | 欄位名或 `(row) => string`。已載入的行裡必須唯一。缺失或重複警告 `RAC-TABLE-ROWID`。選擇、展開和 `scrollToRow` 都用它。 |
| `data` | 本地行。篩選和分頁在瀏覽器裡完成。 |
| `dataSource(query, { signal })` | 遠端分頁。**reject：顯示訊息和重試按鈕。abort 被忽略。** 返回 `{ rows, total }`，`total` 是篩選後的總條數，不是本頁長度。 |
| `columns` | 省略時用第一行的鍵，跳過 `_auto_*`。列的 `type` 只影響格式化，不是表單控制元件。 |
| `pageSize` | 預設 `10`。`pagination` 預設 `true`。 |
| `height` | 預設 `440` 畫素。`"auto"` 填滿已經有高度的父元素。 |
| `virtual` | 可選。用 TanStack Virtual 測量行高。 |
| `query`、`onQueryChange` | 受控查詢。省略則頁碼、排序和篩選留在表格內（排序和篩選也跟隨已儲存的方案）。 |
| `searchFields` | 渲染 `AutoSearch`。它的 `onSearch` 更新表格篩選。 |
| `formFields` | 新增/編輯彈窗的 schema。省略時，列會變成文本或整數控制元件。 |
| `onAdd`、`onEdit`、`onDelete` | 校驗通過後由彈窗呼叫。**reject 或 throw：彈窗保持開啟並顯示 `error.message`。除非你的處理函式已經改了資料，否則行不會變。** |
| `rowActions` | `onClick` 拒絕會被捕捉，並在狀態列顯示約 2.5 秒；資料列不會被移除。 列選單動作缺少 `onClick`，且 `action` 不是已註冊的 `config.rowActions` 鍵時，選取該動作會在狀態列顯示 `RAC-ROW-ACTION`。提供 `onClick` 或註冊對應的 `action`；兩者都有時 `onClick` 優先。 |
| `component` | 欄的 `component` 未在 `AutoConfigProvider` 的 `config.columns` 中註冊時，開發模式警告 `RAC-COLUMN-COMPONENT`，儲存格使用預設格式。註冊該鍵，或在欄上提供 `render`、`format`、`sort`；欄上的函式優先。 |
| `source` | `source` 是 `AutoConfigProvider` 的 `config.sources` 中的資料來源鍵。未知鍵會顯示 `RAC-TABLE-SOURCE` 與重試按鈕。註冊該鍵，或改用 `data` / `dataSource`；三者只能提供一個。 |
| `exportXlsx` | 只有 xlsx 需要。缺少介面卡拋 `RAC-TABLE-XLSX`，狀態行顯示翻譯後的介面卡文案。CSV 和 JSON 是內建的。 |
| `versions` | 提高 layout、sort、filter 或 export 的版本號，丟掉對應的已存方案。 |
| `summaryValues` | 篩選結果的服務端合計，按列鍵索引。 |

## 匯出與設定

`handle.export(format, scope)` 即使狀態行顯示錯誤也會 resolve，錯誤不會再丟擲。遠端表的 `scope: "filtered"` 會逐頁拉取。最後一頁之前出現空頁會拋 `RAC-TABLE-EXPORT-PAGE`，不會下載半份檔案。

佈局、排序、篩選和匯出預設進 `config.storage`（即 `localStorage`），也可再走 `config.settings`。`settings.save` / `load` 失敗會顯示 "Could not save settings" 和重試按鈕。記憶體中的表格繼續可用。

設定裡的篩選 JSON 不合法時，顯示翻譯後的 "Invalid filter"，警告 `RAC-TABLE-FILTER`，並保留上一次篩選。`between` 必須是兩項陣列。`in` 必須是陣列。

`handle.reset()` 清排序、篩選、選擇，並把佈局收回列的預設值。`handle.refresh()` 重新請求 `dataSource`。`handle.scrollToRow(id)` 在該 id 未載入時什麼也不做。

## 前置條件

入口引入一次 `style.css`。同一個源上有多個應用要持久化表格時，設定 `AutoConfigProvider` 的 `namespace`；預設是 `"auto"`。內建的新增/編輯彈窗用的是宣告式對話方塊，不需要 `AutoDialogProvider`。只有 `useAutoDialog()` 需要它。
