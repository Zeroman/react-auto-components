# AutoChat

[English](../../auto-chat.md) | **简体中文** | [繁體中文](../zh-TW/auto-chat.md) | [日本語](../ja/auto-chat.md) | [한국어](../ko/auto-chat.md) | [Español](../es/auto-chat.md) | [Français](../fr/auto-chat.md) | [Deutsch](../de/auto-chat.md) | [Português (Brasil)](../pt-BR/auto-chat.md) | [Русский](../ru/auto-chat.md)

提供可选输入框、流式跟随与更早历史加载的对话布局。AutoChat 不新增运行时依赖，也不会发起网络请求、持久化消息、解析 Markdown、执行工具输出或渲染原始 HTML。

## 用法

```tsx
import { useState } from "react";
import { AutoChat, type AutoChatMessage } from "@zeroman/react-auto-components";
import "@zeroman/react-auto-components/style.css";

export function Conversation() {
  const [messages, setMessages] = useState<AutoChatMessage[]>([]);
  return (
    <AutoChat
      height={600}
      messages={messages}
      onSend={async (text) => {
        setMessages((current) => [
          ...current,
          { id: crypto.randomUUID(), role: "user", content: text },
        ]);
        // 在这里调用你的服务并更新 messages。
      }}
    />
  );
}
```

## 自带渲染器

将 React 节点作为 `content` 传入，或用应用自有字段扩展 `AutoChatMessage` 并提供 `renderMessage(message, { index })`。在这里接入既有的 Markdown 渲染器、代码查看器、附件卡片或工具结果组件。AutoChat 不解释这些格式；纯字符串按文本渲染。宿主渲染器负责链接、HTML 与所有交互内容。

每条消息都有稳定唯一的 `id` 与 `role`：`user`、`assistant`、`system`、`tool` 或 `error`。可选的 `author`、`avatar`、`meta` 与 `streaming` 自定义消息外壳；`renderActions(message, context)` 提供消息操作。流式回复更新时保持同一 ID，并以不可变方式替换 messages 数组。

## 行为与属性

| 属性 | 行为 |
| --- | --- |
| `height` | CSS 高度，默认 `100%`。为父容器给定高度，或传数字如 `600`。历史记录在组件内部滚动。 |
| `autoFollow` | 默认 `true`。跟随底部的新内容与高度变化；读者上滚时暂停。**回到最新** 恢复跟随。 |
| `hasMore`, `onLoadOlder`, `loadingOlder` | 显示更早历史按钮。以稳定 ID 前插消息；可见消息保持锚定。请求会去重，失败的请求可重试。 |
| `onSend(text)` | 启用输入框。接收原始非空文本；可返回 Promise。接受则清空草稿；拒绝则保留草稿并显示通用错误。较新的草稿不会被较旧的发送清空。 |
| `value`, `defaultValue`, `onValueChange` | 受控或本地输入框内容。使用受控值时由宿主应用变更。 |
| `generating`, `onStop` | 生成期间禁用发送并提供停止按钮。宿主必须自行取消流/请求并更新 `generating`。 |
| `sendOnEnter` | 默认 `true`；Shift+Enter 换行。输入法组合事件与确认键不会提交。设为 `false` 仅按钮发送。 |
| `disabled`, `composer` | 禁用内置编辑器，或在使用外部编辑器时隐藏（`composer={false}`）。 |
| `conversationKey` | 切换会话时重置本地草稿、进行中 UI 与滚动。受控值与取消仍由宿主管理。 |
| `header`, `footer`, `empty`, `composerExtra` | React 内容插槽。 |
| `size`, `density` | 覆盖全局 `AutoConfigProvider` 设置。 |
| `labels` | 覆盖内置英文文案。Provider 也会翻译 `chat.send`、`chat.latest` 等 `chat.*` 键。 |
| `onSendError`, `onLoadError` | 接收原始错误用于应用日志；内部错误详情不会自动展示。 |

大量历史记录时设置 `virtual`，复用包内既有的 TanStack Virtual 依赖。只有可见消息与少量 overscan 窗口会挂载，动态行高会被测量。必要时调整 `estimatedMessageHeight`（默认 `120`）与 `overscan`（默认 `6`）。前插历史时保持消息 ID 稳定。虚拟模式下，需要跨行卸载存续的交互状态请保存在宿主中。普通会话默认使用非虚拟布局。

**大历史** 演示加载 1,000、10,000 或 50,000 条可变高度消息，上报实际挂载消息数，并支持追加 100 条、流式、加载更早历史与跳转到任一端。

`AutoChatHandle` ref 暴露 `scrollToBottom()`、`scrollToMessage(id)`（返回 ID 是否存在）、`focusComposer()` 与 `getScrollElement()`。历史区域使用可键盘聚焦的日志；独立的状态区播报发送/生成状态，不会播报每个流式 token。

本地流式模拟、取消、自定义工具卡片、分页、发送失败与十语言 UI 见[可运行演示](../../../test-project/src/examples/ChatDemo.tsx)。

## 演示中的富渲染

私有 `test-project` 安装了 [react-markdown](https://github.com/remarkjs/react-markdown) 与 [remark-gfm](https://github.com/remarkjs/remark-gfm)。这些依赖不属于组件库。格式选择器可插入 Markdown（标题、强调、任务列表与 GFM 表格）、代码、JSON、数据表、本地图片或可交互的 React 评审卡片。

`ChatRenderers.tsx` 根据结构化消息数据选择 React 组件；`ChatTaskCard.tsx` 演示本地交互状态。Markdown 使用 `skipHtml` 与库默认的 URL 处理，不会编译 JSX 或执行代码块。同一个 Markdown 渲染器也展示流式回复。自定义组件由应用提供，不会从可执行消息文本实例化。

```tsx
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

<AutoChat
  messages={messages}
  renderMessage={(message) => (
    <Markdown remarkPlugins={[remarkGfm]} skipHtml>
      {String(message.content ?? "")}
    </Markdown>
  )}
/>
```
