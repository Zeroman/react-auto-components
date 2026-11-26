import { useEffect, useRef, useState } from "react";
import {
  AutoChat,
  type AutoChatHandle,
  type AutoChatMessage,
} from "@zeroman.yang/react-auto-components";

type Msg = AutoChatMessage & { seq: number };

function makeMessages(count: number, start = 0): Msg[] {
  return Array.from({ length: count }, (_, i) => {
    const n = start + i;
    const long = n % 89 === 0;
    return {
      id: `m-${n}`,
      seq: n,
      role: n % 2 === 0 ? "user" : "assistant",
      content: long
        ? `超长消息 #${n}\n${"段落 ".repeat(80)}\n${"🚀".repeat(40)}\n${"x".repeat(2000)}`
        : `消息 #${n}`,
    };
  });
}

export function ChatStress() {
  const chat = useRef<AutoChatHandle>(null);
  const [count, setCount] = useState(10_000);
  const [messages, setMessages] = useState(() => makeMessages(10_000));
  const [session, setSession] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [log, setLog] = useState("");
  const [mounted, setMounted] = useState(0);
  const pending = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const seq = useRef(0);

  const clearTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => () => clearTimer(), []);
  useEffect(() => {
    const el = chat.current?.getScrollElement();
    if (!el) return;
    const measure = () =>
      setMounted(el.querySelectorAll("[data-chat-id]").length);
    measure();
    const obs = new MutationObserver(measure);
    obs.observe(el, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [session]);

  const reload = (n = count) => {
    clearTimer();
    setGenerating(false);
    pending.current = 0;
    setMessages(makeMessages(n));
    setSession((s) => s + 1);
    setLog(`reloaded ${n} messages`);
  };

  const flood = () => {
    const batch = makeMessages(500, messages.length);
    setMessages((rows) => [...rows, ...batch]);
    setLog(`appended 500 · total≈${messages.length + 500}`);
  };

  const stream = () => {
    if (generating) {
      clearTimer();
      setGenerating(false);
      setMessages((rows) =>
        rows.map((row) =>
          row.streaming ? { ...row, streaming: false, content: `${row.content} [stopped]` } : row,
        ),
      );
      setLog("stream interrupted");
      return;
    }
    const id = `stream-${++seq.current}`;
    setMessages((rows) => [
      ...rows,
      {
        id,
        seq: rows.length,
        role: "assistant",
        content: "",
        streaming: true,
      },
    ]);
    setGenerating(true);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setMessages((rows) =>
        rows.map((row) =>
          row.id === id
            ? {
                ...row,
                content: `${row.content}token${i} `,
                streaming: i < 80,
              }
            : row,
        ),
      );
      if (i >= 80) {
        clearTimer();
        setGenerating(false);
        setLog("stream finished");
      }
    }, 30);
  };

  return (
    <div>
      <header className="page-head">
        <h1>AutoChat 极限</h1>
        <p>
          海量虚拟消息、超长内容、流式中断、并发 onSend（后发不应清掉更新草稿）。
        </p>
      </header>
      <div className="toolbar">
        <label>
          规模{" "}
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          >
            {[1_000, 10_000, 50_000].map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString("en-US")}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="primary" onClick={() => reload()}>
          重建会话
        </button>
        <button type="button" onClick={flood}>
          灌入 +500
        </button>
        <button type="button" onClick={stream}>
          {generating ? "中断流式" : "开始流式"}
        </button>
        <button
          type="button"
          onClick={() => {
            chat.current?.scrollToBottom();
            setLog("scrollToBottom()");
          }}
        >
          滚到底
        </button>
        <span className="metric">DOM 消息节点 ≈ {mounted}</span>
      </div>
      <div className="panel chat-frame">
        <AutoChat
          ref={chat}
          height="100%"
          virtual
          estimatedMessageHeight={72}
          overscan={8}
          conversationKey={session}
          messages={messages}
          generating={generating}
          onStop={() => {
            clearTimer();
            setGenerating(false);
            setLog("onStop");
          }}
          onSend={async (text) => {
            const ticket = ++pending.current;
            setLog(`send#${ticket} start · ${text.slice(0, 40)}`);
            await new Promise((r) => setTimeout(r, 400 + (ticket % 3) * 200));
            if (ticket !== pending.current) {
              setLog(`send#${ticket} stale (ignored append)`);
              // Still resolve so composer clears only for the latest accept path —
              // AutoChat keeps newer drafts when an older send settles.
              return;
            }
            setMessages((rows) => [
              ...rows,
              {
                id: `user-${Date.now()}-${ticket}`,
                seq: rows.length,
                role: "user",
                content: text,
              },
              {
                id: `bot-${Date.now()}-${ticket}`,
                seq: rows.length + 1,
                role: "assistant",
                content: `echo #${ticket}: ${text}`,
              },
            ]);
            setLog(`send#${ticket} ok`);
          }}
          onSendError={(err) => setLog(`send error: ${String(err)}`)}
        />
      </div>
      {log && <pre className="log">{log}</pre>}
      <p className="note">
        并发：快速连点发送多次；观察草稿是否被旧请求错误清空，以及 DOM
        挂载节点是否远小于消息总数（虚拟化）。
      </p>
    </div>
  );
}
