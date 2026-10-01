# AutoChat

[English](../../auto-chat.md) | [简体中文](../zh-CN/auto-chat.md) | [繁體中文](../zh-TW/auto-chat.md) | **日本語** | [한국어](../ko/auto-chat.md) | [Español](../es/auto-chat.md) | [Français](../fr/auto-chat.md) | [Deutsch](../de/auto-chat.md) | [Português (Brasil)](../pt-BR/auto-chat.md) | [Русский](../ru/auto-chat.md)

オプションのコンポーザー、ストリーム追従、過去履歴の読み込みを持つ会話レイアウトです。AutoChat はランタイム依存を追加せず、ネットワークリクエスト、メッセージの永続化、Markdown 解析、ツール出力の実行、生 HTML の描画も行いません。

## 使用方法

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
        // ここでサービスを呼び出し、messages を更新します。
      }}
    />
  );
}
```

## レンダラーは自分で用意

React ノードを `content` として渡すか、アプリ側のフィールドで `AutoChatMessage` を拡張し `renderMessage(message, { index })` を指定します。既存の Markdown レンダラー、コードビューア、添付カード、ツール結果コンポーネントをここで接続します。AutoChat はそれらの形式を解釈せず、通常の文字列はテキストとして描画します。リンク、HTML、対話コンテンツの制御はホスト側にあります。

各メッセージは安定した一意の `id` と `role`（`user`、`assistant`、`system`、`tool`、`error`）を持ちます。任意の `author`、`avatar`、`meta`、`streaming` で外観を調整できます。`renderActions(message, context)` はメッセージ操作を提供します。ストリーム返信の更新では同じ ID を維持し、messages 配列は不変に置き換えてください。

## 挙動と props

| Prop | 挙動 |
| --- | --- |
| `height` | CSS の高さ。既定 `100%`。親に確定した高さを与えるか、`600` などの数値を渡します。履歴はコンポーネント内でスクロールします。 |
| `autoFollow` | 既定 `true`。下部の新規・リサイズコンテンツに追従し、読者が上へスクロールすると一時停止します。**最新へ戻る** で追従を再開します。 |
| `hasMore`, `onLoadOlder`, `loadingOlder` | 過去履歴ボタンを表示します。安定した ID でメッセージを先頭に追加し、可視メッセージはアンカーされます。リクエストは重複排除され、失敗時は再試行できます。 |
| `onSend(text)` | コンポーザーを有効化します。元の空でないテキストを受け取り、Promise を返せます。受理すると下書きを消去し、拒否すると保持して汎用エラーを表示します。新しい下書きが古い送信によって消去されることはありません。 |
| `value`, `defaultValue`, `onValueChange` | 制御またはローカルの入力値。制御値の場合、変更はホストで適用します。 |
| `generating`, `onStop` | 生成中は送信を無効化し停止ボタンを表示します。ホストは自身のストリーム/リクエストをキャンセルし `generating` を更新する必要があります。 |
| `sendOnEnter` | 既定 `true`。Shift+Enter で改行します。IME の変換確定では送信されません。`false` でボタンのみ送信します。 |
| `disabled`, `composer` | 内蔵エディターを無効化、または外部エディター利用時に非表示（`composer={false}`）にします。 |
| `conversationKey` | 会話切替時にローカル下書き、進行中 UI、スクロールをリセットします。制御値とキャンセルはホスト管理のままです。 |
| `header`, `footer`, `empty`, `composerExtra` | React コンテンツスロット。 |
| `size`, `density` | グローバルな `AutoConfigProvider` 設定を上書きします。 |
| `labels` | 内蔵英語ラベルを上書きします。Provider は `chat.send` や `chat.latest` などの `chat.*` キーも翻訳します。 |
| `onSendError`, `onLoadError` | 元のエラーを受け取りアプリのロギングに利用できます。内部エラーの詳細は自動表示されません。 |

大規模な履歴では `virtual` を設定し、パッケージ既存の TanStack Virtual 依存を利用します。マウントされるのは可視メッセージと小さな overscan ウィンドウだけで、動的な行高も計測されます。必要に応じて `estimatedMessageHeight`（既定 `120`）と `overscan`（既定 `6`）を調整してください。履歴を先頭に追加する際はメッセージ ID を安定させます。仮想モードでビューポート外のアンマウントをまたぐ対話状態はホスト側に保持してください。通常の会話は既定で非仮想レイアウトです。

**大規模履歴** デモは 1,000／10,000／50,000 件の可変高メッセージを読み込み、実際のマウント件数を表示し、100 件追加、ストリーミング、過去履歴の読み込み、両端へのジャンプに対応します。

`AutoChatHandle` の ref は `scrollToBottom()`、`scrollToMessage(id)`（ID の存在を返す）、`focusComposer()`、`getScrollElement()` を公開します。履歴はキーボードでフォーカス可能なログであり、送信/生成状態は独立したステータス領域が通知し、ストリームのトークンごとには読み上げません。

ローカルのストリーム模倣、キャンセル、カスタムツールカード、ページング、送信失敗、10 言語 UI は[実行可能なデモ](../../../test-project/src/examples/ChatDemo.tsx)を参照してください。

## デモでのリッチな描画

私有の `test-project` は [react-markdown](https://github.com/remarkjs/react-markdown) と [remark-gfm](https://github.com/remarkjs/remark-gfm) をインストールしています。これらはコンポーネントライブラリには含まれません。フォーマット選択は Markdown（見出し、強調、タスクリスト、GFM 表）、コード、JSON、データ表、ローカル画像、対話型 React レビューカードを挿入できます。

`ChatRenderers.tsx` は構造化されたメッセージデータから React コンポーネントを選択します。`ChatTaskCard.tsx` はローカルな対話状態の例です。Markdown は `skipHtml` とライブラリ既定の URL 処理を利用し、JSX のコンパイルやコードフェンスの実行は行いません。同じ Markdown レンダラーでストリーム返信も表示します。カスタムコンポーネントはアプリが提供し、実行可能なメッセージテキストから生成されることはありません。

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
