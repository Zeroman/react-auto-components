# AutoForm

**English** | [简体中文](i18n/zh-CN/auto-form.md) | [繁體中文](i18n/zh-TW/auto-form.md) | [日本語](i18n/ja/auto-form.md) | [한국어](i18n/ko/auto-form.md) | [Español](i18n/es/auto-form.md) | [Français](i18n/fr/auto-form.md) | [Deutsch](i18n/de/auto-form.md) | [Português (Brasil)](i18n/pt-BR/auto-form.md) | [Русский](i18n/ru/auto-form.md)

Schema form. Field widgets, validation, and submit live here. `AutoSearch` and `AutoDialog` render an `AutoForm` internally, so the callback rules below apply to them too.

`Field<T>` is a discriminated union on `type`. `select` without `options`, a scalar on `daterange`, and `match: "between"` on a scalar model field are TypeScript errors. `AnyField` and `unsafeField()` skip those checks; development mode still warns. Codes are in [errors.md](errors.md).

`component` is a key in `AutoConfigProvider` `config.fields`, used when `render` is absent. The field wrapper has `data-testid="rac-field-{name}"`. Submit is `rac-submit` and reset is `rac-reset`. See [llms.txt](../llms.txt).

## Usage

```tsx
import { AutoForm, type Field } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

type Draft = { name: string; status: string };
const fields: Field<Draft>[] = [
  { name: "name", label: "Name", required: true },
  {
    name: "status",
    type: "select",
    label: "Status",
    options: [{ value: "open", label: "Open" }],
  },
];

<AutoForm<Draft> fields={fields} onSubmit={async (value) => save(value)} />
```

## Behavior and props

| Prop | Behavior |
| --- | --- |
| `fields` | `readonly Field<T>[]`. Omitted `type` is a text input. Duplicate `name` throws `RAC-FIELD-DUPLICATE` while mounting. |
| `value` | Controlled value. When it differs from internal state the form copies it and clears errors. If the parent ignores `onChange`, the input snaps back. |
| `defaultValue` | Uncontrolled seed and the reset target. Field `defaultValue` fills keys you omit. Cloned with `structuredClone`. |
| `onChange` | Called after every accepted edit, including patches from a field `onChange`. |
| `onSubmit(value)` | Called only after validation passes. Resolve to finish. **Reject or throw: values stay, `error.message` is shown under the actions, the form does not reset.** |
| `onReset` | Called after the reset button or `handle.reset()`. |
| `disabled` | Blocks edits and submit. Default `false`. |
| `readOnly` | Renders values without inputs. Default `false`. |
| `columns` | Grid columns. Default `2`. `span` is clamped to this. `lineBreak` starts a full-width row. |
| `actions` | Built-in submit and reset. Default `true`. Set `false` when the parent draws the buttons (search and dialog do this). |
| `submitLabel`, `resetLabel` | Replace the built-in labels. The defaults are translated through `config.t`. |
| Label props | `labelPosition` default `"top"`. `labelWidth` default `"auto"` (measured, capped at 45% of the field). `size` and `density` fall back to `AutoConfigProvider`. |

## When a callback throws

| Callback | Result |
| --- | --- |
| `onSubmit` | Caught. Draft kept. Message shown. No reset. |
| Field `rules` | Caught per field. The thrown message becomes that field's error. Later rules are skipped. |
| Field `onChange` | Not caught. The previous form value stays; the keystroke is not committed. |
| `upload` | Rejection is shown under the file input and nothing is stored. `reset()` aborts the `AbortSignal` and drops a late result. |
| Submit while an upload is in flight | `validate()` returns `false` and shows the built-in "wait for the upload" text. `onSubmit` is not called. |
| `hidden`, `disabled`, or failed `canAccess` | That field is not validated, even if `required`. |
| `required` empty | `undefined`, `null`, `""`, or an empty array blocks submit. The message is `"{label} is required"`, passed through `config.t`. |

`handle.validate()` resolves `true` or `false`. It does not throw. `handle.reset()` clears errors and upload state.

## Preconditions

Import `style.css` once. In development a missing `--auto-text` warns `RAC-CSS-MISSING`. `AutoConfigProvider` is optional. It supplies label layout, size, density, `t`, `canAccess`, and storage. It does not provide dialogs.
