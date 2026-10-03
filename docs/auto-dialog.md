# AutoDialog

**English** | [简体中文](i18n/zh-CN/auto-dialog.md) | [繁體中文](i18n/zh-TW/auto-dialog.md) | [日本語](i18n/ja/auto-dialog.md) | [한국어](i18n/ko/auto-dialog.md) | [Español](i18n/es/auto-dialog.md) | [Français](i18n/fr/auto-dialog.md) | [Deutsch](i18n/de/auto-dialog.md) | [Português (Brasil)](i18n/pt-BR/auto-dialog.md) | [Русский](i18n/ru/auto-dialog.md)

Modal dialog, either declarative (`<AutoDialog open>`) or imperative (`useAutoDialog().open()`). A `fields` list renders an [AutoForm](auto-form.md). Without fields, render `content`.


Dialog options accept `tipComponent` and pass it to the inner form, including dialogs opened through `useAutoDialog().open()`.

Resolution order is the item/field/column parameter, the owning component parameter, provider component defaults (`config.tabs`, `config.form`, `config.table`, or `config.menu`), shared `AutoConfigProvider.config.tipComponent`, then built-in `DefaultTip`. Custom components receive `{ content, children, placement }` (`AutoTipProps`) and must preserve the trigger events, ref and accessibility props. `AutoTip` and `DefaultTip` are public exports; the default uses a portal, supports Escape, and keeps the trigger in place.

## Usage

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
          title: "Edit",
          fields: [{ name: "name", label: "Name", required: true }],
          onSubmit: async (values) => save(values),
        })
      }
    >
      Edit
    </button>
  );
}

<AutoDialogProvider>
  <EditButton />
</AutoDialogProvider>
```

`useAutoDialog()` outside the provider throws `RAC-DIALOG-PROVIDER`. The declarative `<AutoDialog open onOpenChange>` does not need the provider.

## Behavior and props

| Prop | Behavior |
| --- | --- |
| `open`, `onOpenChange` | Declarative only. `onOpenChange(false)` runs the close path. |
| `fields` | Schema form inside the body. Validation uses the AutoForm rules. |
| `content` | Used when `fields` is omitted. |
| `onSubmit(values)` | Called after validation passes. **Reject or throw: the dialog stays open and shows `error.message`. Values stay.** Resolve to close, then `beforeClose` still runs. |
| `beforeClose(reason)` | `reason` is `"submit"`, `"cancel"`, or `"close"`. **Return `false` to stay open. Throw to stay open and show the message.** |
| `onClose(reason)` | Called only after the dialog actually closes. |
| `draftKey` | Persists the draft at `${namespace}:draft:${draftKey}` until a successful submit removes it. Omit it and nothing is stored. |
| `showReset` | Shows the form reset control. |
| `hideFooter` | Hides the default confirm / cancel row. Use `footer` to draw your own. |
| `draggable` | Drag the header. Ignored while fullscreen. |
| `width` | Pixels. Default `560`. |
| `fullscreen` | Initial fullscreen. The header button toggles it. |
| `size` | Falls back to the provider size. Default `"medium"`. |

`handle.close()` from `useAutoDialog().open()` resolves `false` when `beforeClose` blocks the close.

Imperative dialogs stack. Each `open()` returns `{ id, close }`. `close(id)` closes that one.

## Preconditions

Import `style.css` once. `AutoConfigProvider` is optional. Its `namespace` is part of `draftKey` storage, and its `t` translates the built-in buttons. It is not a substitute for `AutoDialogProvider`.
