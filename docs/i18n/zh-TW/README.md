# React Auto Components

[English](../../../README.md) | [简体中文](../zh-CN/README.md) | **繁體中文** | [日本語](../ja/README.md) | [한국어](../ko/README.md) | [Español](../es/README.md) | [Français](../fr/README.md) | [Deutsch](../de/README.md) | [Português (Brasil)](../pt-BR/README.md) | [Русский](../ru/README.md)

獨立、以 schema 驅動的 React 19 元件庫，涵蓋表單、表格與對話。以 TypeScript、TanStack Table 9 / Form / Virtual、Radix 與 Floating UI 建構,不使用 Ant Design、Element Plus 或 MUI。函式庫建置採用 React Compiler。

[![Auto Studio 示範截圖](../../assets/demo.png)](https://zeroman.github.io/react-auto-components/)

<p align="center">
  <a href="https://zeroman.github.io/react-auto-components/"><strong>🚀 線上示範 (GitHub Pages)</strong></a> · <a href="#示範與獨立測試專案">本機執行</a> · <a href="#元件">元件列表</a>
</p>

## 專案狀態

目前版本為 0.1.3,API 仍可能變動。需要 React 19。本套件提供 ESM 與 TypeScript 型別宣告。內建介面文字預設為英文,可透過 AutoConfigProvider.config.t 進行翻譯。

使用 `pnpm add @zeroman.yang/react-auto-components` 安裝（npm、yarn 同樣可用）。peer dependency 為 React 19 與 react-dom 19。請在入口引入一次樣式：`import "@zeroman.yang/react-auto-components/style.css"`。

在應用程式入口引入一次 `import "@zeroman.yang/react-auto-components/style.css"`。缺少樣式時，開發模式警告 `RAC-CSS-MISSING`。

XLSX 匯出缺少 `exportXlsx` 配接器時為 `RAC-TABLE-XLSX`；無法載入選用相依套件 `exceljs` 時為 `RAC-XLSX-DEP`。從 `@zeroman.yang/react-auto-components/xlsx` 匯入並傳入配接器，按需執行 `pnpm add exceljs`。CSV 與 JSON 不需要它。

- [線上示範 (GitHub Pages)](https://zeroman.github.io/react-auto-components/)
- [貢獻指南](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/zh-TW/CONTRIBUTING.md)
- [變更紀錄](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/zh-TW/CHANGELOG.md)
- [帳號設定與發佈](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/zh-TW/publishing.md)
- [MIT 授權條款](../../../LICENSE)

## 示範與獨立測試專案

可在瀏覽器中直接開啟 **[線上示範](https://zeroman.github.io/react-auto-components/)**。

本機執行與開發（需要 Node.js >= 22.12 和 pnpm 12.5）：

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

開啟 http://127.0.0.1:4173。測試專案包含全部七個元件的頁面，以及本機／伺服器端／10,000 筆資料／樹狀表格、CRUD、提交失敗重試、草稿、巢狀分頁和動態列高範例。

示範會自動偵測瀏覽器語言,並以英文作為後備。可從頁首或全域設定中選擇語言;所選語言會在重新載入後保留。選擇 Auto 即可再次跟隨瀏覽器語言。支援十種語言。頁面會填滿整個視區,表格與較長的面板會在其自身區域內捲動。

每個範例頁面都提供**檢視原始碼**按鈕，會在彈窗中開啟該範例的真實原始碼檔案，支援檔案切換、一鍵複製與前往 GitHub。

`test-project` 有自己的 package.json 和鎖定檔。它安裝 `pnpm pack` 的實際輸出，不使用原始碼別名。修改元件庫後，請再次執行 `pnpm prepare:test-project`；指令碼使用包含內容雜湊的檔名，避免沿用過期的 tarball 快取。

### 自動化更新與可重複使用指令

修改元件或範例後，可一鍵完成自動化編譯與截圖更新：

```sh
pnpm demo:update       # 完整更新：建置元件庫、更新測試專案、打包 demo 靜態檔案並自動截取最新畫面
pnpm demo:build        # 僅編譯 demo 靜態產物至 demo-dist（適配 GitHub Pages）
pnpm demo:screenshot   # 僅透過無周邊 Chromium 重新截取 docs/assets/demo.png
```

程式碼推送到 `main` 分支時，GitHub Actions 會自動建置並部署靜態檔案至 GitHub Pages。

## 使用方式

```tsx
import { useState } from 'react';
import {
  AutoConfigProvider, AutoDialogProvider, AutoTable,
  type AutoColumn, type Field,
} from '@zeroman.yang/react-auto-components';
import '@zeroman.yang/react-auto-components/style.css';

type Person = { id: number; name: string; enabled: boolean };
const columns: AutoColumn<Person>[] = [
  { key: 'name', label: '姓名', sortable: true },
  { key: 'enabled', label: '已啟用', options: [
    { label: '是', value: true }, { label: '否', value: false },
  ] },
];
const fields: Field<Person>[] = [
  { name: 'name', label: '姓名', required: true },
  { name: 'enabled', label: '已啟用', type: 'switch', defaultValue: true },
];
export function App() {
  const [rows, setRows] = useState<Person[]>([]);
  return <AutoConfigProvider config={{ namespace: 'my-app' }}>
    <AutoDialogProvider>
      <AutoTable<Person> id="people" rowKey="id" data={rows}
        columns={columns} formFields={fields} searchFields={fields}
        onAdd={value => setRows(old => [...old, { ...value, id: Date.now() }])}
        onEdit={(row, value) => setRows(old => old.map(item => item.id === row.id ? { ...row, ...value } : item))}
        onDelete={selected => setRows(old => old.filter(item => !selected.some(row => row.id === item.id)))}
      />
    </AutoDialogProvider>
  </AutoConfigProvider>;
}
```

欄位、資料行和 ref 使用泛型：無效的欄位名稱或預設值會產生編譯期錯誤。Provider 支援命名空間、權限、欄位標籤翻譯、自訂欄位、通知和持久化介接器。 內建標籤、驗證訊息與無障礙文字皆使用 AutoConfigProvider.config.t;明確指定的元件標籤具有較高優先順序。

t 回呼會接收訊息鍵值與後備文字。翻譯內建訊息時請保留 {0}、{1} 等編號佔位符;元件會在翻譯之後代入其值。

## 元件

| 元件 | 功能 |
| --- | --- |
| AutoForm | 原生欄位型別、選項虛擬化、連動選擇、上傳介接器、自訂繪製、相依欄位、條件式顯示、非同步驗證、受控狀態、失敗後保留輸入 |
| AutoSearch | 基本／進階條件、手動／即時搜尋、重設、排序標籤、共用查詢 AST 和 RSQL 序列化 |
| AutoTable | 本機／遠端資料、多欄排序、欄位篩選、分頁、穩定的選取狀態、虛擬化、樹狀／詳細資料展開、彙總、合併儲存格、CRUD、快顯功能表和複製 |
| AutoDialog | 宣告式／命令式 API、隔離的 Provider、草稿、關閉防護、焦點管理、拖曳、全螢幕和非同步提交 |
| AutoTabs | 水平／垂直版面、巢狀結構、權限、停用分頁、保留面板狀態和重新整理 |
| AutoMenu | 側邊導覽，支援圖示、描述、徽章、巢狀分組、權限與可折疊圖示欄 |
| AutoChat | 呼叫端自訂訊息渲染、可選虛擬化、串流跟隨、錨定歷史載入、傳送／停止輸入框與自訂操作 |

表格版面、排序、篩選和匯出各自支援具名預設組態與獨立版本。持久化預設使用 localStorage，也可注入遠端介接器。內建 JSON/CSV 匯出。XLSX 使用獨立的選用介接器：

```tsx
import { exportXlsx } from '@zeroman.yang/react-auto-components/xlsx';
// <AutoTable ... exportXlsx={exportXlsx} />
```

ExcelJS 會在首次使用介接器時動態載入，並排除於元件庫的主要進入點之外。只使用 CSV/JSON 的應用程式可在安裝時略過選用相依套件。

## 驗證

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium  # 僅首次執行
pnpm test:e2e
```

單元測試涵蓋欄位、非同步驗證、查詢、對話方塊、虛擬化、表格、設定遷移和匯出。Playwright 測試透過打包後的公開進入點測試互動。桌面／行動版螢幕截圖儲存至 `test-project/test-results`。

## 行為與慣例

- 這是專為 React 設計的 API，並非逐一對應 Vue 屬性或方法的相容層。請參閱[遷移指南](migration.md)。
- 資料由應用程式碼管理。CRUD 回呼負責持久化變更；失敗時擲出例外即可保留編輯內容。成功後，元件會重新整理遠端資料。本機資料必須由呼叫端更新。
- 表格的 `id` 必須在命名空間內唯一，`rowKey` 則必須在所有頁面和樹狀節點間唯一。伺服器端模式必須明確提供 `columns`，資料來源需回傳總筆數。
- 當 `query` / `value` 為受控狀態時，父元件必須處理回呼並更新其值。非受控使用方式可省略這些 props。
- 合併儲存格使用非虛擬化的語意化表格，適合分頁資料，可避免 rowSpan 在不同虛擬視窗間錯位。
- 伺服器端針對所有篩選結果的彙總透過 `summaryValues` 提供。缺少彙總時顯示 `—`，不會將當頁合計當成整體合計。設定 `summaryScope="page"` 可明確計算當頁彙總。
- 上傳進行中會暫停提交。重設、替換欄位值或卸載會取消舊的上傳；延遲回傳的結果無法覆寫較新的值。
- 遠端匯出所有篩選結果時，會逐頁請求資料。大型應用程式可以自行實作伺服器端匯出。
- 請明確從 `style.css` 匯入瀏覽器樣式。JavaScript 模組可在沒有 `window` 的 Node 環境中匯入。

## 使用 AutoTable 填滿剩餘高度

`height={440}` 仍會為資料捲動區設定固定高度。使用 `height="auto"` 時，整張表格會填滿父層版面配置分配的高度。搜尋區、工具列和分頁使用其自然高度；資料區使用剩餘空間並獨立捲動：

```tsx
<div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', gap: 12 }}>
  <header>頁面標題與描述</header>
  <AutoTable<Person> id="people" rowKey="id" data={rows}
    columns={columns} height="auto" />
  <footer>頁面頁尾</footer>
</div>
```

父層必須有確定的高度。在巢狀 flex 容器中使用 `flex: 1; min-height: 0` 將剩餘空間向下傳遞，或在 grid 版面中使用 `grid-template-rows: auto minmax(0, 1fr) auto`。不需要用 JavaScript 計算視窗高度減去工具列高度：版面配置會處理搜尋欄位的新增／移除、工具列換行及父層尺寸變更，虛擬清單則會跟隨捲動區的實際尺寸。

這不會依資料列數量調整表格大小。空資料集或少量資料仍會填滿可用空間。父層至少必須容納搜尋區、工具列和分頁本身。

測試專案在 **AutoTable → 剩餘高度** 分頁展示此功能，同時保留側邊欄和頁首。舊版網址 `http://127.0.0.1:4173/?demo=auto-height` 會直接選取該分頁。瀏覽器測試位於 `test-project/tests/auto-height.spec.ts`。

## 全域表單版面配置

使用 `AutoConfigProvider.config.form` 可統一設定一般表單、搜尋面板、表格搜尋區和對話方塊表單。標籤可放在控制項上方或左側，文字靠左／靠右對齊可獨立設定。預設為上方標籤與寬鬆間距。

```tsx
<AutoConfigProvider config={{
  form: {
    labelPosition: 'left', // 'top'：在上方；'left'：在控制項左側
    labelAlign: 'right',   // 文字靠右對齊；標籤位於控制項左側
    labelWidth: 80,
    density: 'compact',   // 'comfortable'：間距較寬鬆
  },
}}>
  <App />
</AutoConfigProvider>
```

巢狀 Provider 會逐一合併版面設定屬性。明確指定的元件 props 優先於外層 Provider。例如，全域使用行內標籤時，仍可讓個別表單保留上方標籤：

```tsx
<AutoForm fields={fields} labelPosition="top" density="comfortable" />
<AutoTable id="people" rowKey="id" data={rows} columns={columns}
  searchFields={searchFields}
  searchLayout={{ labelWidth: 100, columns: 3 }} />
```

`labelWidth` 預設為 `"auto"`，也接受像素數值或 `"6em"` 等 CSS 寬度。自動模式下，每個搜尋標籤依文字調整寬度；一般表單與對話方塊表單則依可見標籤共用寬度，讓控制項對齊。長標籤最多佔欄位寬度的 45%，超出部分會換行，保留控制項的空間。明確設定的固定寬度不受此自動上限限制。緊密的搜尋區在空間允許時會將操作按鈕放在同一列，窄螢幕則換行。標籤關聯保持完整，錯誤與說明會對齊控制項，長標籤可換行。

在示範專案中，從側邊欄或右上角齒輪開啟 **全域設定**，即可修改版面、密度、標籤寬度和主題。變更會立即生效，且不會清除目前輸入。表單頁面支援 **跟隨全域** 或區域覆寫。示範專案透過 Provider 明確啟用緊密的行內版面。

## 全域尺寸與密度

`AutoConfigProvider` 支援 `size: "small" | "medium" | "large"` 和 `density: "compact" | "comfortable"`。明確指定的元件 props 優先於元件類別設定，而元件類別設定優先於全域值：

```tsx
<AutoConfigProvider config={{
  size: "medium",
  density: "compact",
  form: { labelPosition: "left", labelAlign: "right" },
  table: { density: "compact" },
  tabs: { density: "compact" },
}}>
  <AutoForm fields={fields} size="small" />
</AutoConfigProvider>
```

表格密度也支援 `normal`。表格設定面板預設跟隨全域設定。選擇緊密、一般或寬鬆間距會覆寫全域密度，並與版面預設組態一同儲存；元件的 `density` prop 具有最高優先權。巢狀元件的區域尺寸會各自獨立套用。

表單支援 `resetLabel`、`extraActions` 和 `onReset`；搜尋面板支援 `searchLabel`、`resetLabel` 和 `extraActions`；對話方塊支援 `cancelLabel` 和 `extraActions`。`AutoTabs` 項目可定義 `badge`，`AutoTable.empty` 可自訂空白狀態內容。

### AutoChat

AutoChat 提供輕量的對話版面，具備串流跟隨、歷史載入與輸入區。供應 React 內容或 renderMessage 來渲染訊息，無需額外的執行時相依套件。

[AutoChat API](auto-chat.md)

回呼拋錯之後元件會怎樣，見行為契約：[AutoForm](auto-form.md)、[AutoSearch](auto-search.md)、[AutoTable](auto-table.md)、[AutoDialog](auto-dialog.md)、[AutoTabs](auto-tabs.md)、[AutoMenu](auto-menu.md)。開發者錯誤碼：[errors.md](errors.md)。
