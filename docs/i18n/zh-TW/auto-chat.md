# AutoChat

[English](../../auto-chat.md) | [简体中文](../zh-CN/auto-chat.md) | **繁體中文** | [日本語](../ja/auto-chat.md) | [한국어](../ko/auto-chat.md) | [Español](../es/auto-chat.md) | [Français](../fr/auto-chat.md) | [Deutsch](../de/auto-chat.md) | [Português (Brasil)](../pt-BR/auto-chat.md) | [Русский](../ru/auto-chat.md)

提供可選輸入框、串流跟隨與更早歷史載入的對話版面。AutoChat 不新增執行時期相依性，也不會發送網路請求、持久化訊息、解析 Markdown、執行工具輸出或渲染原始 HTML。

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
        // 在此呼叫你的服務並更新 messages。
      }}
    />
  );
}
```

## 自帶渲染器

將 React 節點作為 `content` 傳入，或以應用自有欄位擴充 `AutoChatMessage` 並提供 `renderMessage(message, { index })`。在此串接既有的 Markdown 渲染器、程式碼檢視器、附件卡片或工具結果元件。AutoChat 不解釋這些格式；純字串以文字呈現。宿主渲染器負責連結、HTML 與所有互動內容。

每則訊息都有穩定唯一的 `id` 與 `role`：`user`、`assistant`、`system`、`tool` 或 `error`。可選的 `author`、`avatar`、`meta` 與 `streaming` 自訂訊息外殼；`renderActions(message, context)` 提供訊息操作。串流回覆更新時保持同一 ID，並以不可變方式替換 messages 陣列。

## 行為與屬性

| 屬性 | 行為 |
| --- | --- |
| `height` | CSS 高度，預設 `100%`。為父容器給定高度，或傳數字如 `600`。歷史記錄在元件內部捲動。 |
| `autoFollow` | 預設 `true`。跟隨底部的新內容與高度變化；讀者上捲時暫停。**回到最新** 恢復跟隨。 |
| `hasMore`, `onLoadOlder`, `loadingOlder` | 顯示更早歷史按鈕。以穩定 ID 前插訊息；可見訊息保持錨定。請求會去重，失敗的請求可重試。 |
| `onSend(text)` | 啟用輸入框。接收原始非空文字；可回傳 Promise。接受則清空草稿；拒絕則保留草稿並顯示通用錯誤。較新的草稿不會被較舊的發送清空。 |
| `value`, `defaultValue`, `onValueChange` | 受控或本機輸入框內容。使用受控值時由宿主套用變更。 |
| `generating`, `onStop` | 生成期間停用發送並提供停止按鈕。宿主必須自行取消串流/請求並更新 `generating`。 |
| `sendOnEnter` | 預設 `true`；Shift+Enter 換行。輸入法組字事件與確認鍵不會送出。設為 `false` 僅按鈕發送。 |
| `disabled`, `composer` | 停用內建編輯器，或在使用外部編輯器時隱藏（`composer={false}`）。 |
| `conversationKey` | 切換對話時重設本機草稿、進行中 UI 與捲動。受控值與取消仍由宿主管理。 |
| `header`, `footer`, `empty`, `composerExtra` | React 內容插槽。 |
| `size`, `density` | 覆蓋全域 `AutoConfigProvider` 設定。 |
| `labels` | 覆蓋內建英文文案。Provider 也會翻譯 `chat.send`、`chat.latest` 等 `chat.*` 鍵。 |
| `onSendError`, `onLoadError` | 接收原始錯誤供應用記錄；內部錯誤細節不會自動顯示。 |

大量歷史記錄時設定 `virtual`，重用套件既有的 TanStack Virtual 相依性。只有可見訊息與少量 overscan 視窗會掛載，動態列高會被量測。必要時調整 `estimatedMessageHeight`（預設 `120`）與 `overscan`（預設 `6`）。前插歷史時保持訊息 ID 穩定。虛擬模式下，需要跨列卸載存續的互動狀態請保存在宿主。一般對話預設使用非虛擬版面。

**大型歷史** 示範載入 1,000、10,000 或 50,000 筆可變高度訊息，回報實際掛載訊息數，並支援附加 100 筆、串流、載入更早歷史與跳至任一端。

`AutoChatHandle` ref 暴露 `scrollToBottom()`、`scrollToMessage(id)`（回傳 ID 是否存在）、`focusComposer()` 與 `getScrollElement()`。歷史區域使用可鍵盤聚焦的日誌；獨立狀態區播報發送/生成狀態，不會播報每個串流 token。

本機串流模擬、取消、自訂工具卡片、分頁、發送失敗與十語言 UI 見[可執行示範](../../../test-project/src/examples/ChatDemo.tsx)。

## 示範中的富渲染

私有 `test-project` 安裝了 [react-markdown](https://github.com/remarkjs/react-markdown) 與 [remark-gfm](https://github.com/remarkjs/remark-gfm)。這些相依性不屬於元件庫。格式選擇器可插入 Markdown（標題、強調、任務清單與 GFM 表格）、程式碼、JSON、資料表、本機圖片或可互動的 React 評審卡片。

`ChatRenderers.tsx` 依結構化訊息資料選擇 React 元件；`ChatTaskCard.tsx` 示範本機互動狀態。Markdown 使用 `skipHtml` 與函式庫預設的 URL 處理，不會編譯 JSX 或執行程式碼區塊。同一個 Markdown 渲染器也展示串流回覆。自訂元件由應用提供，不會從可執行訊息文字實例化。

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
