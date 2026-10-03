# AutoForm

[English](../../auto-form.md) | **简体中文** | [繁體中文](../zh-TW/auto-form.md) | [日本語](../ja/auto-form.md) | [한국어](../ko/auto-form.md) | [Español](../es/auto-form.md) | [Français](../fr/auto-form.md) | [Deutsch](../de/auto-form.md) | [Português (Brasil)](../pt-BR/auto-form.md) | [Русский](../ru/auto-form.md)

按 schema 渲染的表单。控件、校验和提交都在这里。`AutoSearch` 和 `AutoDialog` 内部也渲染 `AutoForm`，所以下面的回调规则对它们同样有效。

`Field<T>`（别名 `FormItem<T>`）按 `type` 做判别联合，由交互控件 `FormField<T>` 和结构化展示项 `DisplayItem<T>` 组成：
- **表单字段**：绑定值的录入控件（如 `input`、`number`、`integer`、`select`、`virtual-select`、`date`、`daterange`、`switch`、`checkbox`、`radio`、`file`）。`select` 不给 `options`、`daterange` 配标量、标量字段上写 `match: "between"`，都是 TypeScript 错误。`virtual-select`（或 `type: "select", virtual: true`）支持长列表虚拟滚动（替代旧版 `select-v2`）。`AnyField` 和 `unsafeField()` 是逃生舱；开发模式仍会警告。错误码见 [errors.md](errors.md)。
- **展示项**：纯展示与辅助排版项（`title`、`tip`、`button`、`append`、`divider`）。校验时自动跳过，不收集表单值。`tip` 和 `append` 支持传入 `content?: ReactNode`。

具名字段的 `tip` 在字段悬停或内部控件聚焦时显示浮层；输入框通过 `aria-describedby` 同时关联持久的帮助文本与校验错误。自定义 `render`／注册字段应将 `context.describedBy` 传给每个控件的 `aria-describedby`。字段的 `tipComponent` 优先于表单参数。展示字段 `type: "tip"` 和 `"append"` 仍直接显示内容。

优先级为：单项／字段／列参数 → 所属组件参数 → Provider 的组件默认配置（`config.tabs`、`config.form`、`config.table` 或 `config.menu`）→ 全局 `AutoConfigProvider.config.tipComponent` → 内置 `DefaultTip`。自定义组件接收 `{ content, children, placement }`（`AutoTipProps`），需保留触发元素的事件、ref 和无障碍属性。`AutoTip` 与 `DefaultTip` 均已导出；默认实现通过 portal 显示，支持 Escape 关闭，触发元素位置不变。

### 样式插槽（Slots）

`AutoForm` 与单个字段均支持细粒度的 `classNames` 和 `styles` 插槽：
- **`AutoForm`**：`classNames?: AutoFormClassNames`（`root`、`field`、`label`、`input`、`tip`、`error`、`actions`、`submit`、`reset`、`cancel`）与 `styles?: AutoFormStyles`。
- **字段 / 展示项**：`classNames?: FieldClassNames`（`root`、`label`、`input`、`tip`、`error`）与 `styles?: FieldStyles`。


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
    label: "状态",
    options: [{ value: "open", label: "进行中" }],
  },
];

<AutoForm<Draft> fields={fields} onSubmit={async (value) => save(value)} />
```

## 行为与属性

| 属性 | 行为 |
| --- | --- |
| `fields` | `readonly Field<T>[]`。不写 `type` 就是文本框。`name` 重复会在挂载时抛 `RAC-FIELD-DUPLICATE`。 |
| `value` | 受控值。与内部状态不同时，表单会抄过来并清空错误。父组件不理 `onChange`，输入会弹回。 |
| `defaultValue` | 非受控初值，也是重置目标。字段自己的 `defaultValue` 补上没写的键。用 `structuredClone` 复制。 |
| `onChange` | 每次接受的修改都会调用，包括字段 `onChange` 返回的补丁。 |
| `onSubmit(value)` | 只在校验通过后调用。resolve 即结束。**reject 或 throw：值保留，操作区下方显示 `error.message`，不会重置。** |
| `onReset` | 点重置或调用 `handle.reset()` 之后触发。 |
| `disabled` | 禁止编辑和提交。默认 `false`。 |
| `readOnly` | 只显示值，不渲染输入框。默认 `false`。 |
| `columns` | 栅格列数。默认 `2`。`span` 不会超过它。`lineBreak` 独占一行。 |
| `actions` | 内置提交和重置。默认 `true`。父组件自己画按钮时设为 `false`（搜索和弹窗就是这样）。 |
| `submitLabel`、`resetLabel` | 替换内置文案。默认文案经 `config.t` 翻译。 |
| 标签 | `labelPosition` 默认 `"top"`。`labelWidth` 默认 `"auto"`（测量后，最多占字段宽度的 45%）。`size` 和 `density` 回落到 `AutoConfigProvider`。 |

## 回调抛错之后

| 回调 | 结果 |
| --- | --- |
| `onSubmit` | 被捕获。草稿保留。显示消息。不重置。 |
| 字段 `rules` | 按字段捕获。抛出的消息变成该字段的错误。后面的规则不再跑。 |
| 字段 `onChange` | 不捕获。表单仍是上一次的值，这次按键不会写入。 |
| `upload` | 拒绝后，错误显示在文件框下面，不写入值。`reset()` 会 abort `AbortSignal`，迟到的结果被丢掉。 |
| 上传未完成就提交 | `validate()` 返回 `false`，并显示「请等待上传」的内置文案。不会调用 `onSubmit`。 |
| `hidden`、`disabled` 或 `canAccess` 不通过 | 该字段不参与校验，即使 `required`。 |
| `required` 为空 | `undefined`、`null`、`""` 或空数组会挡住提交。文案是 `"{label} is required"`，再走 `config.t`。 |

`handle.validate()` resolve `true` 或 `false`，不抛错。`handle.reset()` 清错误和上传状态。

## 前置条件

入口引入一次 `style.css`。开发模式读不到 `--auto-text` 时警告 `RAC-CSS-MISSING`。`AutoConfigProvider` 可选，用来提供标签布局、尺寸、密度、`t`、`canAccess` 和存储。它不提供弹窗。
