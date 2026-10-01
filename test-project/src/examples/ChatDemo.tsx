import { useEffect, useRef, useState } from "react";
import { AutoChat } from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";

import {
  ChatMessageContent,
  chatFormats,
  type ChatFormat,
  type DemoMessage,
} from "./ChatRenderers";
import { ChatPerformanceDemo } from "./ChatPerformanceDemo";
import { ChatRenderingDemo } from "./ChatRenderingDemo";
import { ChatLayoutDemo, ChatEdgeDemo } from "./ChatStateDemo";
import { ChatHooksDemo } from "./ChatHooksDemo";
import "./chat-renderers.css";
import "./rendering-lab.css";

const initialMessages = (): DemoMessage[] => [
  { id: "welcome", role: "assistant", textKey: "chat.welcome" },
  { id: "question", role: "user", textKey: "chat.prompt" },
  { id: "answer", role: "assistant", textKey: "chat.answer" },
  { id: "tool", role: "tool", tool: true },
];

/** A local simulation; the host owns transport, content rendering and cancellation. */
export function ChatDemo() {
  const tr = useDemoText();
  const [messages, setMessages] = useState(initialMessages);
  const [mode, setMode] = useState("conversation");
  const [format, setFormat] = useState<ChatFormat>("markdown");
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [conversation, setConversation] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const serial = useRef(0);
  const clearTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => () => clearTimer(), []);
  const stop = () => {
    clearTimer();
    setGenerating(false);
    setMessages((rows) =>
      rows.map((row) => (row.streaming ? { ...row, streaming: false } : row)),
    );
  };
  const send = async (text: string) => {
    if (failNext) {
      setFailNext(false);
      throw new Error("Simulated send failure");
    }
    clearTimer();
    const id = `reply-${++serial.current}`;
    setMessages((rows) => [
      ...rows,
      { id: `user-${serial.current}`, role: "user", text },
      {
        id,
        role: "assistant",
        textKey: "chat.reply",
        progress: 0,
        streaming: true,
      },
    ]);
    setGenerating(true);
    let progress = 0;
    const length = tr("chat.reply").length;
    timer.current = setInterval(() => {
      progress += 4;
      const done = progress >= length;
      setMessages((rows) =>
        rows.map((row) =>
          row.id === id
            ? {
                ...row,
                progress: done ? undefined : progress,
                streaming: !done,
              }
            : row,
        ),
      );
      if (done) {
        clearTimer();
        setGenerating(false);
      }
    }, 55);
  };

  return (
    <div className="chat-demo chat-demo-formats">
      <div
        className="chat-demo-modes"
        role="group"
        aria-label={tr("chat.render.mode")}
      >
        {[
          "conversation",
          "performance",
          "rendering",
          "layouts",
          "hooks",
          "edges",
        ].map((next) => (
          <button
            key={next}
            type="button"
            aria-pressed={mode === next}
            onClick={() => {
              stop();
              setMode(next);
            }}
          >
            {tr(`chat.render.${next}`)}
          </button>
        ))}
      </div>
      {mode === "performance" ? (
        <ChatPerformanceDemo />
      ) : mode === "rendering" ? (
        <ChatRenderingDemo />
      ) : mode === "layouts" ? (
        <ChatLayoutDemo />
      ) : mode === "edges" ? (
        <ChatEdgeDemo />
      ) : mode === "hooks" ? (
        <ChatHooksDemo />
      ) : (
        <AutoChat
          messages={messages}
          conversationKey={conversation}
          value={draft}
          onValueChange={setDraft}
          onSend={send}
          onStop={stop}
          generating={generating}
          header={
            <div className="chat-demo-heading">
              <div>
                <strong>{tr("chat.demoTitle")}</strong>
                <p>{tr("chat.render.summary")}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearTimer();
                  setGenerating(false);
                  setMessages(initialMessages());
                  setDraft("");
                  setHistoryPage(0);
                  setConversation((n) => n + 1);
                }}
              >
                {tr("chat.reset")}
              </button>
            </div>
          }
          hasMore={historyPage < 3}
          onLoadOlder={() => {
            const page = historyPage + 1;
            setMessages((rows) => [
              ...Array.from({ length: 15 }, (_, i): DemoMessage => ({
                id: `history-${page}-${i}`,
                role: i % 2 ? "assistant" : "user",
                textKey: "chat.history",
                meta: `#${(3 - page) * 15 + i + 1}`,
              })),
              ...rows,
            ]);
            setHistoryPage(page);
          }}
          renderMessage={(message) => (
            <ChatMessageContent message={message} tr={tr} />
          )}
          composerExtra={
            <div className="chat-demo-controls">
              <label>
                {tr("chat.render.examples")}{" "}
                <select
                  aria-label={tr("chat.render.examples")}
                  value={format}
                  onChange={(event) =>
                    setFormat(event.target.value as ChatFormat)
                  }
                >
                  {chatFormats.map((name) => (
                    <option key={name} value={name}>
                      {tr(`chat.render.${name}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() =>
                  setMessages((rows) => [
                    ...rows,
                    {
                      id: `example-${++serial.current}`,
                      role: "assistant",
                      format,
                    },
                  ])
                }
              >
                {tr("chat.render.insert")}
              </button>
              <label className="chat-demo-failure">
                <input
                  type="checkbox"
                  checked={failNext}
                  onChange={(event) => setFailNext(event.target.checked)}
                />
                {tr("chat.simulateError")}
              </label>
            </div>
          }
          footer={<span>{tr("chat.inputHint")}</span>}
        />
      )}
    </div>
  );
}
