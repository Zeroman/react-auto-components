# AutoDialog

[English](../../auto-dialog.md) | [简体中文](../zh-CN/auto-dialog.md) | **繁體中文** | [日本語](../ja/auto-dialog.md) | [한국어](../ko/auto-dialog.md) | [Español](../es/auto-dialog.md) | [Français](../fr/auto-dialog.md) | [Deutsch](../de/auto-dialog.md) | [Português (Brasil)](../pt-BR/auto-dialog.md) | [Русский](../ru/auto-dialog.md)

模態彈窗。可以宣告式（`<AutoDialog open>`），也可以命令式（`useAutoDialog().open()`）。傳入 `fields` 會渲染 [AutoForm](auto-form.md)。不傳欄位時渲染 `content`。

## 用法

```tsx
import {
  AutoDialogProvider,
  useAutoDialog,
} from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

function EditButton() {
  const dialog = useAutoDialog();
  return (
    <button
      onClick={() =>
        dialog.open({
          title: "編輯",
          fields: [{ name: "name", label: "姓名", required: true }],
          onSubmit: async (values) => save(values),
        })
      }
    >
      編輯
    </button>
  );
}

<AutoDialogProvider>
  <EditButton />
</AutoDialogProvider>
```

在 provider 外呼叫 `useAutoDialog()` 會拋 `RAC-DIALOG-PROVIDER`。宣告式 `<AutoDialog open onOpenChange>` 不需要 provider。

## 行為與屬性

| 屬性 | 行為 |
| --- | --- |
| `open`、`onOpenChange` | 僅宣告式。`onOpenChange(false)` 走關閉流程。 |
| `fields` | 正文裡的 schema 表單。校驗規則與 AutoForm 相同。 |
| `content` | 沒有 `fields` 時使用。 |
| `onSubmit(values)` | 校驗通過後呼叫。**reject 或 throw：彈窗保持開啟，顯示 `error.message`，值保留。** resolve 後仍會走 `beforeClose`。 |
| `beforeClose(reason)` | `reason` 為 `"submit"`、`"cancel"` 或 `"close"`。**返回 `false` 則保持開啟。throw 也保持開啟並顯示訊息。** |
| `onClose(reason)` | 只有真正關掉之後才呼叫。 |
| `draftKey` | 草稿存在 `${namespace}:draft:${draftKey}`，成功提交後刪除。不傳則不儲存。 |
| `showReset` | 顯示錶單重置。 |
| `hideFooter` | 隱藏預設的確認/取消。用 `footer` 自己畫。 |
| `draggable` | 拖標題欄。全屏時忽略。 |
| `width` | 畫素。預設 `560`。 |
| `fullscreen` | 初始全屏。標題欄按鈕可切換。 |
| `size` | 回落到 provider 的尺寸。預設 `"medium"`。 |

`useAutoDialog().open()` 返回的 `close()` 在 `beforeClose` 攔住時 resolve `false`。

命令式彈窗可以疊多層。每次 `open()` 返回 `{ id, close }`。`close(id)` 關掉對應的一層。

## 前置條件

入口引入一次 `style.css`。`AutoConfigProvider` 可選。它的 `namespace` 會進入 `draftKey` 的儲存鍵，`t` 翻譯內建按鈕。它不能代替 `AutoDialogProvider`。
