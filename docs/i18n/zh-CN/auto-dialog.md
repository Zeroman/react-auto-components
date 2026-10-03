# AutoDialog

[English](../../auto-dialog.md) | **简体中文** | [繁體中文](../zh-TW/auto-dialog.md) | [日本語](../ja/auto-dialog.md) | [한국어](../ko/auto-dialog.md) | [Español](../es/auto-dialog.md) | [Français](../fr/auto-dialog.md) | [Deutsch](../de/auto-dialog.md) | [Português (Brasil)](../pt-BR/auto-dialog.md) | [Русский](../ru/auto-dialog.md)

模态弹窗。可以声明式（`<AutoDialog open>`），也可以命令式（`useAutoDialog().open()`）。传入 `fields` 会渲染 [AutoForm](auto-form.md)。不传字段时渲染 `content`。


弹窗参数支持 `tipComponent` 并传给内部表单，`useAutoDialog().open()` 打开的弹窗也适用。

优先级为：单项／字段／列参数 → 所属组件参数 → Provider 的组件默认配置（`config.tabs`、`config.form`、`config.table` 或 `config.menu`）→ 全局 `AutoConfigProvider.config.tipComponent` → 内置 `DefaultTip`。自定义组件接收 `{ content, children, placement }`（`AutoTipProps`），需保留触发元素的事件、ref 和无障碍属性。`AutoTip` 与 `DefaultTip` 均已导出；默认实现通过 portal 显示，支持 Escape 关闭，触发元素位置不变。

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
          title: "编辑",
          fields: [{ name: "name", label: "姓名", required: true }],
          onSubmit: async (values) => save(values),
        })
      }
    >
      编辑
    </button>
  );
}

<AutoDialogProvider>
  <EditButton />
</AutoDialogProvider>
```

在 provider 外调用 `useAutoDialog()` 会抛 `RAC-DIALOG-PROVIDER`。声明式 `<AutoDialog open onOpenChange>` 不需要 provider。

## 行为与属性

| 属性 | 行为 |
| --- | --- |
| `open`、`onOpenChange` | 仅声明式。`onOpenChange(false)` 走关闭流程。 |
| `fields` | 正文里的 schema 表单。校验规则与 AutoForm 相同。 |
| `content` | 没有 `fields` 时使用。 |
| `onSubmit(values)` | 校验通过后调用。**reject 或 throw：弹窗保持打开，显示 `error.message`，值保留。** resolve 后仍会走 `beforeClose`。 |
| `beforeClose(reason)` | `reason` 为 `"submit"`、`"cancel"` 或 `"close"`。**返回 `false` 则保持打开。throw 也保持打开并显示消息。** |
| `onClose(reason)` | 只有真正关掉之后才调用。 |
| `draftKey` | 草稿存在 `${namespace}:draft:${draftKey}`，成功提交后删除。不传则不存储。 |
| `showReset` | 显示表单重置。 |
| `hideFooter` | 隐藏默认的确认/取消。用 `footer` 自己画。 |
| `draggable` | 拖标题栏。全屏时忽略。 |
| `width` | 像素。默认 `560`。 |
| `fullscreen` | 初始全屏。标题栏按钮可切换。 |
| `size` | 回落到 provider 的尺寸。默认 `"medium"`。 |

`useAutoDialog().open()` 返回的 `close()` 在 `beforeClose` 拦住时 resolve `false`。

命令式弹窗可以叠多层。每次 `open()` 返回 `{ id, close }`。`close(id)` 关掉对应的一层。

## 前置条件

入口引入一次 `style.css`。`AutoConfigProvider` 可选。它的 `namespace` 会进入 `draftKey` 的存储键，`t` 翻译内置按钮。它不能代替 `AutoDialogProvider`。
