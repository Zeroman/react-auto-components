# 變更紀錄

[English](../../CHANGELOG.md) | [简体中文](../zh-CN/CHANGELOG.md) | **繁體中文** | [日本語](../ja/CHANGELOG.md) | [한국어](../ko/CHANGELOG.md) | [Español](../es/CHANGELOG.md) | [Français](../fr/CHANGELOG.md) | [Deutsch](../de/CHANGELOG.md) | [Português (Brasil)](../pt-BR/CHANGELOG.md) | [Русский](../ru/CHANGELOG.md)

## 尚未發佈

- 新增 `AutoNavigation`。已掛載的元件登記到路徑樹上。`goto` 支援相對路徑、權限檢查和中止訊號。只有提交後的位置會同步到 hash、browser 或 memory history。`AutoMenu` 和 `AutoTabs` 可傳入 `route`，並跟隨目前的子節點。
- 新增 `AutoTip` 和 `DefaultTip`。欄位、欄、選單和標籤的提示改為浮動層。展示類型 `tip` 和 `append` 仍是行內內容。優先順序是項目自身的元件、所屬元件、`config.form` / `config.table` / `config.tabs` / `config.menu`，然後是 `config.tipComponent`。
- `AutoSearch` 的 `mode` 預設改為 `"instant"`。隱藏欄位和 `canAccess` 未通過的欄位仍留在值物件裡，但不進入查詢。搜尋選項寫在 `search` 上；原本的頂層 `match` 仍然可用。
- `AutoTable` 的 `toolbarActions` 控制重新整理、設定、匯出和 JSON 按鈕的顯示。`handle.refresh()` 和 `handle.export()` 仍然可用。兩個及以上排序時才顯示排序標籤。
- 表單支援 `classNames` 和 `styles` 槽、`divider` 展示項，以及 `virtual-select`。

## 0.1.3 - 2026-10-02

- 內建介面文字預設改為英文，這串英文同時是 `config.t` 的鍵。其他語言請傳入 `t`。原先的中文鍵，例如 `提交` 和 `刷新`，不再是預設值。
- 搜尋表單改為 `AutoSearch`（`AutoSearchProps`）。`AutoSearchPanel` 與 `AutoSearchPanelProps` 仍作為已棄用別名保留。
- `Field<T>` 改為依 `type` 的判別聯合。`select` 缺少 `options`、純量用在 `daterange` 或 `datetimerange`、純量欄位上的 `match: "between"` 都是 TypeScript 錯誤。`AnyField` 與 `unsafeField()` 仍是逃生艙。
- 開發者錯誤改為英文 `RacError`，帶元件名、修復動作和錯誤碼。見 [errors.md](errors.md)。開發模式會警告未引入樣式、空的表格 id、重複的 `rowKey`、沒有 options 的選擇欄位，以及不是兩項陣列的區間值。
- `AutoConfigProvider` 增加 JSON 登錄表：`config.fields`、`config.columns`、`config.rowActions`、`config.sources`。字串鍵分別解析 `Field.component`、欄的 `render` / `format` / `sort` / `exportFormat`、`RowAction.action` 和 `AutoTable` 的 `source`。欄位、欄或操作上的函式優先。巢狀 provider 會合併，後寫的鍵覆蓋先寫的。`data`、`dataSource`、`source` 只能傳一個。未知 source 顯示 `RAC-TABLE-SOURCE` 和重試。
- 為欄位、表格、搜尋、表單和彈窗增加穩定的 `data-testid="rac-*"`，不隨翻譯文字變化。
- 新增 `useAutoTabsWorkspace`，用於動態標籤的開啟、切換和關閉，支援固定標籤和可選的 session 儲存。標籤可以是 `closable`、`lazy`、`disabled` 或 `loading`。
- 行為說明：[AutoForm](auto-form.md)、[AutoSearch](auto-search.md)、[AutoTable](auto-table.md)、[AutoDialog](auto-dialog.md)、[AutoTabs](auto-tabs.md)、[AutoMenu](auto-menu.md)。套件根目錄的 `llms.txt` 是代理的入口。
- `v*` 標籤會經 GitHub Actions 的 Trusted Publishing 發佈到 npm。`./run.sh release` 在乾淨的 `main` 上把修訂版本加一。

## 0.1.2 - 2026-10-01

- 以 `@zeroman.yang/react-auto-components` 發佈。npm 上的 `@zeroman` scope 屬於其他帳號。

- 新增 AutoChat：訊息渲染由呼叫端掌控，支援串流跟隨、歷史錨定載入、可選輸入框與十語言示範；無新增執行時期相依性。
- 線上示範新增「檢視原始碼」彈窗，可查看每個範例的真實原始碼，支援檔案切換、一鍵複製與 GitHub 轉跳。
- 結構描述驅動的 React 19 元件：AutoForm、AutoSearchPanel、AutoTable、AutoDialog、AutoTabs、AutoMenu。
- 全域尺寸與密度、表單標籤版面、持久化表格設定，以及選用的 XLSX 匯出。
- 使用真正 tarball 的使用端專案、單元測試、型別檢查與 Chromium 互動測試。
- MIT 授權條款、貢獻指南、GitHub CI、Issue 範本，以及 npm 帳號設定與發佈說明。
- 預設英文文件，搭配完整譯文與語言切換連結。
