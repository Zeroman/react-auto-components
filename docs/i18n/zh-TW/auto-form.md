# AutoForm

[English](../../auto-form.md) | [简体中文](../zh-CN/auto-form.md) | **繁體中文** | [日本語](../ja/auto-form.md) | [한국어](../ko/auto-form.md) | [Español](../es/auto-form.md) | [Français](../fr/auto-form.md) | [Deutsch](../de/auto-form.md) | [Português (Brasil)](../pt-BR/auto-form.md) | [Русский](../ru/auto-form.md)

按 schema 渲染的表單。控制元件、校驗和提交都在這裡。`AutoSearch` 和 `AutoDialog` 內部也渲染 `AutoForm`，所以下面的回撥規則對它們同樣有效。

`Field<T>` 按 `type` 做判別聯合。`select` 不給 `options`、`daterange` 配標量、標量欄位上寫 `match: "between"`，都是 TypeScript 錯誤。`AnyField` 和 `unsafeField()` 是逃生艙；開發模式仍會警告。錯誤碼見 [errors.md](errors.md)。

## 用法

```tsx
import { AutoForm, type Field } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

type Draft = { name: string; status: string };
const fields: Field<Draft>[] = [
  { name: "name", label: "姓名", required: true },
  {
    name: "status",
    type: "select",
    label: "狀態",
    options: [{ value: "open", label: "進行中" }],
  },
];

<AutoForm<Draft> fields={fields} onSubmit={async (value) => save(value)} />
```

## 行為與屬性

| 屬性 | 行為 |
| --- | --- |
| `fields` | `readonly Field<T>[]`。不寫 `type` 就是文本框。`name` 重複會在掛載時拋 `RAC-FIELD-DUPLICATE`。 |
| `value` | 受控值。與內部狀態不同時，表單會抄過來並清空錯誤。父元件不理 `onChange`，輸入會彈回。 |
| `defaultValue` | 非受控初值，也是重置目標。欄位自己的 `defaultValue` 補上沒寫的鍵。用 `structuredClone` 複製。 |
| `onChange` | 每次接受的修改都會呼叫，包括欄位 `onChange` 返回的補丁。 |
| `onSubmit(value)` | 只在校驗通過後呼叫。resolve 即結束。**reject 或 throw：值保留，操作區下方顯示 `error.message`，不會重置。** |
| `onReset` | 點重置或呼叫 `handle.reset()` 之後觸發。 |
| `disabled` | 禁止編輯和提交。預設 `false`。 |
| `readOnly` | 只顯示值，不渲染輸入框。預設 `false`。 |
| `columns` | 柵格列數。預設 `2`。`span` 不會超過它。`lineBreak` 獨佔一行。 |
| `actions` | 內建提交和重置。預設 `true`。父元件自己畫按鈕時設為 `false`（搜尋和彈窗就是這樣）。 |
| `submitLabel`、`resetLabel` | 替換內建文案。預設文案經 `config.t` 翻譯。 |
| 標籤 | `labelPosition` 預設 `"top"`。`labelWidth` 預設 `"auto"`（測量後，最多佔欄位寬度的 45%）。`size` 和 `density` 回落到 `AutoConfigProvider`。 |

## 回撥拋錯之後

| 回撥 | 結果 |
| --- | --- |
| `onSubmit` | 被捕獲。草稿保留。顯示訊息。不重置。 |
| 欄位 `rules` | 按欄位捕獲。丟擲的訊息變成該欄位的錯誤。後面的規則不再跑。 |
| 欄位 `onChange` | 不捕獲。表單仍是上一次的值，這次按鍵不會寫入。 |
| `upload` | 拒絕後，錯誤顯示在檔案框下面，不寫入值。`reset()` 會 abort `AbortSignal`，遲到的結果被丟掉。 |
| 上傳未完成就提交 | `validate()` 返回 `false`，並顯示「請等待上傳」的內建文案。不會呼叫 `onSubmit`。 |
| `hidden`、`disabled` 或 `canAccess` 不通過 | 該欄位不參與校驗，即使 `required`。 |
| `required` 為空 | `undefined`、`null`、`""` 或空陣列會擋住提交。文案是 `"{label} is required"`，再走 `config.t`。 |

`handle.validate()` resolve `true` 或 `false`，不拋錯。`handle.reset()` 清錯誤和上傳狀態。

## 前置條件

入口引入一次 `style.css`。開發模式讀不到 `--auto-text` 時警告 `RAC-CSS-MISSING`。`AutoConfigProvider` 可選，用來提供標籤佈局、尺寸、密度、`t`、`canAccess` 和儲存。它不提供彈窗。
