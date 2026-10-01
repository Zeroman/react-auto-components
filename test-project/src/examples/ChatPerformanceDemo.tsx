import { useEffect, useRef, useState } from "react";
import {
  AutoChat,
  type AutoChatHandle,
  type AutoChatMessage,
} from "@zeroman/react-auto-components";
import { useDemoText } from "../i18n";
import { MarkdownMessage } from "./ChatRenderers";

interface HistoryMessage extends AutoChatMessage {
  number: number;
  progress?: number;
}
const makeHistory = (count: number, start = 0): HistoryMessage[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `history-${start + i}`,
    number: start + i,
    role: (start + i) % 3 === 0 ? "user" : "assistant",
  }));

export function ChatPerformanceDemo() {
  const tr = useDemoText();
  const chat = useRef<AutoChatHandle>(null);
  const [selected, setSelected] = useState(10000);
  const [messages, setMessages] = useState(() => makeHistory(10000));
  const [session, setSession] = useState(0);
  const [mounted, setMounted] = useState(0);
  const [generating, setGenerating] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const older = useRef(0);
  const sequence = useRef(0);
  const clearTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => () => clearTimer(), []);
  useEffect(() => {
    const log = chat.current?.getScrollElement();
    if (!log) return;
    const measure = () =>
      setMounted(log.querySelectorAll("[data-chat-id]").length);
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(log, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [session]);
  const stop = () => {
    clearTimer();
    setGenerating(false);
    setMessages((rows) =>
      rows.map((row) => (row.streaming ? { ...row, streaming: false } : row)),
    );
  };
  const stream = () => {
    if (generating) {
      stop();
      return;
    }
    const id = `stream-${++sequence.current}`;
    setMessages((rows) => [
      ...rows,
      {
        id,
        number: rows.length,
        role: "assistant",
        progress: 0,
        streaming: true,
      },
    ]);
    setGenerating(true);
    let progress = 0;
    timer.current = setInterval(() => {
      progress += 12;
      setMessages((rows) =>
        rows.map((row) =>
          row.id === id ? { ...row, progress, streaming: progress < 960 } : row,
        ),
      );
      if (progress >= 960) {
        clearTimer();
        setGenerating(false);
      }
    }, 40);
  };
  return (
    <div className="chat-performance">
      <AutoChat
        ref={chat}
        messages={messages}
        virtual
        estimatedMessageHeight={104}
        overscan={6}
        conversationKey={session}
        composer={false}
        generating={generating}
        header={
          <div className="chat-performance-toolbar">
            <label>
              {tr("chat.render.count")}{" "}
              <select
                aria-label={tr("chat.render.count")}
                value={selected}
                onChange={(event) => setSelected(Number(event.target.value))}
              >
                {[1000, 10000, 50000].map((n) => (
                  <option value={n} key={n}>
                    {n.toLocaleString("en-US")}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                clearTimer();
                setGenerating(false);
                older.current = 0;
                setMessages(makeHistory(selected));
                setSession((n) => n + 1);
              }}
            >
              {tr("chat.render.load")}
            </button>
            <button
              type="button"
              onClick={() =>
                setMessages((rows) => [
                  ...rows,
                  ...makeHistory(100, rows.length),
                ])
              }
            >
              {tr("chat.render.append")}
            </button>
            <button type="button" onClick={stream}>
              {tr(generating ? "chat.stop" : "chat.render.stream")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (messages[0]) chat.current?.scrollToMessage(messages[0].id);
              }}
            >
              {tr("chat.render.start")}
            </button>
            <button
              type="button"
              onClick={() => chat.current?.scrollToBottom()}
            >
              {tr("chat.render.end")}
            </button>
            <div className="chat-performance-stats" aria-live="polite">
              <span>
                {tr("chat.render.count")}:{" "}
                <strong data-testid="chat-message-count">
                  {messages.length}
                </strong>
              </span>
              <span>
                {tr("chat.render.mounted")}:{" "}
                <strong data-testid="chat-mounted-count">{mounted}</strong>
              </span>
            </div>
          </div>
        }
        hasMore
        onLoadOlder={() => {
          older.current -= 100;
          const start = older.current;
          setMessages((rows) => [...makeHistory(100, start), ...rows]);
        }}
        renderMessage={(message) => (
          <MarkdownMessage
            text={
              message.progress !== undefined
                ? Array(12)
                    .fill(tr("chat.reply"))
                    .join("\n\n")
                    .slice(0, message.progress)
                : `**#${message.number + 1}** ${tr("chat.render.largeMessage")}${message.number % 4 === 0 ? `\n\n${tr("chat.render.largeDetail")}\n\n\`id: ${message.id}\`` : ""}`
            }
          />
        )}
        footer={tr("chat.render.performanceHint")}
      />
    </div>
  );
}
