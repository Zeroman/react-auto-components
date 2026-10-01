# AutoChat

**English** | [简体中文](i18n/zh-CN/auto-chat.md) | [繁體中文](i18n/zh-TW/auto-chat.md) | [日本語](i18n/ja/auto-chat.md) | [한국어](i18n/ko/auto-chat.md) | [Español](i18n/es/auto-chat.md) | [Français](i18n/fr/auto-chat.md) | [Deutsch](i18n/de/auto-chat.md) | [Português (Brasil)](i18n/pt-BR/auto-chat.md) | [Русский](i18n/ru/auto-chat.md)

A conversation layout with an optional composer, streaming follow and earlier-history loading. AutoChat adds no runtime dependency. It does not make network requests, persist messages, parse Markdown, execute tool output or render raw HTML.

## Usage

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
        // Send to your service and update messages here.
      }}
    />
  );
}
```

## Bring your own renderer

Pass React nodes as `content`, or extend `AutoChatMessage` with your application's fields and supply `renderMessage(message, { index })`. Connect an existing Markdown renderer, code viewer, attachment card or tool-result component there. AutoChat never interprets those formats; a plain string is rendered as text. The host renderer controls links, HTML and any interactive content.

Each message has a stable, unique `id` and a `role`: `user`, `assistant`, `system`, `tool`, or `error`. Optional `author`, `avatar`, `meta` and `streaming` customize its shell. `renderActions(message, context)` supplies message actions. Keep the same ID while updating a streamed reply, and replace the messages array immutably.

## Behavior and props

| Prop | Behavior |
| --- | --- |
| `height` | CSS height, default `100%`. Give the parent a definite height, or pass a number such as `600`. History scrolls inside the component. |
| `autoFollow` | Defaults to `true`. Follow new and resized content at the bottom; pause when the reader scrolls up. **Back to latest** resumes following. |
| `hasMore`, `onLoadOlder`, `loadingOlder` | Show an earlier-history button. Prepend messages with stable IDs; the visible message stays anchored. Requests are deduplicated, and a rejected request can be retried. |
| `onSend(text)` | Enables the composer. Receives the original nonblank text; may return a promise. Accepting clears that draft; rejecting preserves it and displays a generic error. A newer draft is never cleared by an older send. |
| `value`, `defaultValue`, `onValueChange` | Controlled or local composer value. For a controlled value, apply changes in the host. |
| `generating`, `onStop` | Disable sends during generation and expose a stop button. The host must cancel its own stream/request and update `generating`. |
| `sendOnEnter` | Defaults to `true`; Shift+Enter inserts a newline. Composition events and IME confirmation never submit. Set to `false` for button-only sending. |
| `disabled`, `composer` | Disable the built-in editor or hide it (`composer={false}`) when using an external editor. |
| `conversationKey` | Reset local draft, pending UI and scroll when switching conversations. Controlled values and cancellation remain host-owned. |
| `header`, `footer`, `empty`, `composerExtra` | React content slots. |
| `messageLayout` | `"role"` (default) uses role-based alignment; `"left"` or `"right"` aligns every role to that side; `"full"` stretches each message across the available width. Works with virtual and ordinary histories. |
| `size`, `density` | Override the global `AutoConfigProvider` settings. |
| `labels` | Override built-in English labels. The provider also translates `chat.send`, `chat.latest`, and other `chat.*` keys. |
| `onSendError`, `onLoadError` | Receive the original error for application logging; internal error details are not displayed automatically. |

For large histories, set `virtual` to use the package's existing TanStack Virtual dependency. Only visible messages and a small overscan window mount; dynamic row heights are measured. Tune `estimatedMessageHeight` (default `120`) and `overscan` (default `6`) if needed. Keep message IDs stable when prepending history. In virtual mode, keep interactive message state in the host when it must survive rows unmounting outside the viewport. Ordinary conversations use the nonvirtual layout by default.

The **Large history** demo loads 1,000, 10,000 or 50,000 variable-height messages, reports the actual mounted message count, and supports appending 100 messages, streaming, loading older history and jumping to either end.

The `AutoChatHandle` ref exposes `scrollToBottom()`, `scrollToMessage(id)` (returns whether the ID exists), `focusComposer()` and `getScrollElement()`. The history uses a keyboard-focusable log; a separate status region announces send/generation state without announcing each streamed token.

See [the runnable demo](../test-project/src/examples/ChatDemo.tsx) for a local streaming simulation, cancellation, a custom tool card, pagination, send failure and ten-language UI.

## Rich rendering in the demo

The private `test-project` installs [react-markdown](https://github.com/remarkjs/react-markdown) and [remark-gfm](https://github.com/remarkjs/remark-gfm). These dependencies are not part of the component library. Its format picker inserts Markdown (headings, emphasis, task lists and GFM tables), code, JSON, data tables, a local image, or an interactive React review card.

`ChatRenderers.tsx` chooses React components from structured message data. `ChatTaskCard.tsx` demonstrates local interaction state. Markdown uses `skipHtml` and the library's default URL handling; it does not compile JSX or run code fences. The same Markdown renderer displays streamed replies. Custom components are supplied by the application, not instantiated from executable message text.

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

## Interactive test pages

The demo has six pages: Conversation, Large history, Rendering, Message layout, Hooks, and Edge states. Rendering covers mixed content, long tokens, wide code and tables, nested Markdown, Unicode/RTL, dynamic image/disclosure heights, partial streamed Markdown, and unsafe markup. Message layout compares all roles with optional avatars and virtualization.

Hooks records real `onValueChange`, `onSend`, `onSendError`, `onStop`, `onLoadOlder`, `onLoadError`, message actions and imperative handle calls in a bounded event log. Edge states provides empty, read-only, disabled, controlled, pending and failed-send scenarios. Its manual resolve/reject controls allow switching conversations while a request is pending to inspect draft isolation. These simulations use local data only.
