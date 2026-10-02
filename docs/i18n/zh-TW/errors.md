# 錯誤碼

[English](../../errors.md) | [简体中文](../zh-CN/errors.md) | **繁體中文** | [日本語](../ja/errors.md) | [한국어](../ko/errors.md) | [Español](../es/errors.md) | [Français](../fr/errors.md) | [Deutsch](../de/errors.md) | [Português (Brasil)](../pt-BR/errors.md) | [Русский](../ru/errors.md)

開發者錯誤丟擲 `RacError`，或在開發模式 `console.warn`。正文始終是英文：

```text
[Component] 哪裡錯了。
Fix: 怎麼改。
Code: RAC-…
Docs: https://github.com/Zeroman/react-auto-components/blob/main/docs/errors.md#rac-…
```

介面文案仍走 `config.t`。`RacError.userKey` 是英文源句，宿主照舊翻譯。控制台和異常本身保持英文，方便模型按報錯修改。

## RAC-FIELD-OPTIONS

`type` 為 `select`、`select-v2`、`radio`、`checkbox` 或 `cascader`，但沒有 `options`，或 `options` 是空陣列。

修復：傳入 `options` 陣列，或 `(values) => Option[]`。`autocomplete` 可以不傳，它是帶可選建議的文本框。

## RAC-FIELD-RANGE

`type` 為 `daterange` 或 `datetimerange`，但模型欄位或當前值不是兩項陣列。

修復：把欄位型別寫成 `[start, end]`。`dateValue` 預設 `"string"`（`YYYY-MM-DD`）。`"timestamp"` 存本地時區的毫秒時間戳。`null` 表示該端不限制。

標量字串或數字在 TypeScript 裡直接報錯，錯誤文本含 `RAC-FIELD-RANGE`。模型若是陣列型別則能通過編譯；執行值長度不是 2 時，開發模式會警告。

## RAC-FIELD-BETWEEN

`match: "between"` 的模型欄位或當前值不是 `[from, to]`。

修復：存成兩項元組。標量不會命中任何行。`Field<T>` 上這同樣是型別錯誤。

## RAC-FIELD-CUSTOM

`type: "custom"` 既沒有 `render` 也沒有 `component`。

修復：傳入 `render(context)`，或把 `component` 設為 `AutoConfigProvider` 的 `config.fields` 裡的鍵。

## RAC-FIELD-DUPLICATE

兩個欄位 `name` 相同。表單掛載時 `defaults` 丟擲。

修復：名字唯一。`title`、`tip`、`append`、`button` 沒有名字，不參與檢查。

## RAC-CSS-MISSING

開發模式在 `:root` 上讀不到 `--auto-text`。樣式表會設定這個變數。沒引入樣式時頁面是亂的，DOM 裡看不出原因。

修復：在應用入口寫一次 `import "@zeroman.yang/react-auto-components/style.css"`。

## RAC-TABLE-XLSX

呼叫了 `export("xlsx")`，但沒有傳 `exportXlsx`。

修復：`import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx"`，並傳入 `exportXlsx={exportXlsx}`。介面仍顯示翻譯後的 "Configure the XLSX export adapter"。

## RAC-XLSX-DEP

xlsx 介面卡載入不到 `exceljs`。它是 `optionalDependency`，普通安裝可能把它跳過。

修復：`pnpm add exceljs`。CSV 和 JSON 不需要它。

## RAC-TABLE-EXPORT-PAGE

遠端匯出時，最後一頁之前出現了空頁，因此沒有儲存檔案。

修復：`total` 要穩定，並且每一頁都返回該 `pageIndex` 的行。介面顯示翻譯後的 "Export data is incomplete. Try again."。

## RAC-TABLE-ROWID

已載入的行裡 `rowKey` 缺失或重複。僅開發警告。

修復：每行要有穩定且唯一的字串。選擇、展開和 `scrollToRow` 都用它。

## RAC-TABLE-ID

`AutoTable` 的 `id` 是空的，設定會寫到 `${namespace}:table:`。僅開發警告。

修復：每張表傳一個穩定的 id。

## RAC-COLUMN-COMPONENT

欄的 `component` 未在 `AutoConfigProvider` 的 `config.columns` 中註冊時，開發模式警告 `RAC-COLUMN-COMPONENT`，儲存格使用預設格式。註冊該鍵，或在欄上提供 `render`、`format`、`sort`；欄上的函式優先。

## RAC-ROW-ACTION

列選單動作缺少 `onClick`，且 `action` 不是已註冊的 `config.rowActions` 鍵時，選取該動作會在狀態列顯示 `RAC-ROW-ACTION`。提供 `onClick` 或註冊對應的 `action`；兩者都有時 `onClick` 優先。

## RAC-TABLE-SOURCE

`source` 是 `AutoConfigProvider` 的 `config.sources` 中的資料來源鍵。未知鍵會顯示 `RAC-TABLE-SOURCE` 與重試按鈕。註冊該鍵，或改用 `data` / `dataSource`；三者只能提供一個。

## RAC-TABLE-FILTER

設定裡的篩選 JSON 不是合法查詢。介面仍顯示翻譯後的 "Invalid filter"，並保留上一次的篩選。

修復：分組是 `{ kind: "group", operator: "and" | "or", children }`。條件是 `{ kind: "condition", field, operator, value }`，`field` 必須是列鍵。`between` 的值是 `[from, to]`。`in` 的值是陣列。

## RAC-QUERY-FIELD

`serializeRsql` 拒絕了不符合 `/^[\w.]+$/` 的欄位名。

修復：只用字母、數字、下劃線和點。先重新命名或對映列，再序列化。

## RAC-DIALOG-PROVIDER

在 `AutoDialogProvider` 之外呼叫了 `useAutoDialog()`。

修復：在該樹外包一層 `<AutoDialogProvider>`。`AutoConfigProvider` 不提供彈窗，而且是可選的。宣告式 `<AutoDialog open>` 不用這個 hook。
