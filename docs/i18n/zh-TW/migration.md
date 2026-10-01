# 元件整合指南

[English](../../migration.md) | [简体中文](../zh-CN/migration.md) | **繁體中文** | [日本語](../ja/migration.md) | [한국어](../ko/migration.md) | [Español](../es/migration.md) | [Français](../fr/migration.md) | [Deutsch](../de/migration.md) | [Português (Brasil)](../pt-BR/migration.md) | [Русский](../ru/migration.md)

透過 React 泛型、回呼與 Provider 來設定元件。下表將常見的應用需求對應到公開 API 與可執行的範例。

| 原始使用情境 | React API | 可執行範例／測試 |
| --- | --- | --- |
| 表單欄位與 v-model | `fields: Field<T>[]`、`value/onChange` 或 `defaultValue` | `test-project/src/App.tsx` 的表單頁面；`tests/form*.test.tsx` |
| 插槽與附加內容 | 欄位 `render`、資料行 `render/header`、ReactNode | 表單／表格頁面 |
| 表單實例操作 | `ref.validate/reset/getValues/setValue/focus` | `tests/form.test.tsx` |
| 搜尋、關聯條件、RSQL | `buildQuery`、`matchesQuery`、`serializeRsql` | 搜尋頁面；`tests/query.test.ts` |
| 本機／遠端表格資料 | `data` 或 `dataSource(query,{signal})` | 表格頁面；`tests/table.test.tsx` |
| 版面／篩選／排序／匯出預設組態 | 設定對話方塊中的獨立預設組態，可透過 `versions` 分別失效 | 表格頁面；`tests/table-settings.test.ts` |
| 樹狀結構、詳細資料、彙總、合併儲存格 | `getChildren/renderExpanded`、資料行的 `summary/merge` | 樹狀與展開範例；`tests/table-advanced.test.tsx` |
| 新增、編輯、刪除 | `formFields` 與 `onAdd/onEdit/onDelete` | 瀏覽器 CRUD 測試 |
| 命令式對話方塊 | `AutoDialogProvider` + `useAutoDialog().open()` | 對話方塊頁面；`tests/dialog.test.tsx` |
| 彈出視窗服務 | `AutoPopoverProvider` + `useAutoPopover()` | 彈出視窗頁面；`tests/popover.test.tsx` |
| 虛擬捲動 | `AutoScroll` 與 ref 方法 | 捲動頁面；10,000 筆資料的瀏覽器測試 |
| 分頁與巢狀分頁 | `AutoTabs` 的 items、value/onChange、keepMounted | 分頁頁面；`tests/tabs.test.tsx` |

## 欄位型別

`input/email/textarea/integer/float/percentage/progress/switch/select/select-v2/radio/checkbox/cascader/autocomplete/date/datetime/daterange/datetimerange/upload/text/title/tip/button/append/custom`。

`select-v2` 將選項虛擬化。日期範圍使用兩個具有獨立標籤的原生輸入框；`dateValue` 用來選擇字串或時間戳記。數字輸入允許編輯過程中的中間狀態；請使用欄位規則，在提交時驗證業務限制。`rules` 支援非同步驗證，隱藏欄位則跳過驗證。選項會保留數字／布林值，不會強制轉為字串。

```tsx
const fields: Field<User>[] = [
  { name: 'name', label: '姓名', required: true },
  { name: 'note', label: '備註', hidden: values => !values.enabled,
    render: ({ value, onChange, disabled }) =>
      <textarea disabled={disabled} value={String(value ?? '')}
        onChange={event => onChange(event.target.value)} /> },
];
```

完整 API 請參閱匯出的 TypeScript 型別。`Field<T>` 綁定 T 的實際鍵值；標題與提示等結構性項目不需要資料屬性。

## 伺服器端資料來源

```tsx
const dataSource: DataSource<User> = async (query, { signal }) => {
  const response = await fetch('/api/users/search', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!response.ok) throw new Error('載入失敗');
  return response.json(); // { rows: User[], total: number }
};
```

頁面索引從 0 開始。`sort` 是有序的欄位陣列；`filter` 是結構化查詢樹。元件會取消舊請求，並防止延遲回應覆寫較新的查詢。當資料來源閉包外的業務條件變更時，請呼叫表格的 `ref.refresh()`。請保持資料來源函式的參照穩定，以避免不必要的請求。RSQL 序列化只是供需要此格式的後端使用的介接器，不會執行查詢字串。

## 應用程式上傳與持久化

欄位的 `upload(files, signal)` 會在應用程式儲存檔案後回傳欄位值。元件負責顯示上傳失敗；呼叫端提供上傳 URL、驗證與物件儲存政策。

```tsx
<AutoConfigProvider config={{
  namespace: 'tenant-admin',
  canAccess: access => !access.permissions?.length || access.permissions.every(p => myPermissions.includes(p)),
  settings: {
    load: key => api.loadTableSettings(key),
    save: (key, settings) => api.saveTableSettings(key, settings),
  },
  notify: (message, level) => showToast(message, level),
}}>{children}</AutoConfigProvider>
```

本機變更會立即套用;遠端儲存會依序執行,失敗後可選擇重試。變更已持久化設定的格式時,請使用新的 table id 或版本,以避免載入不相容的設定。
