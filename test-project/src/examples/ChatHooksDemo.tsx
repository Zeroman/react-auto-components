import { useEffect, useRef, useState } from "react";
import {
  AutoChat,
  type AutoChatHandle,
  type AutoChatMessage,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";

/** Demo-only event recorder: bounded memory and no transport or persistence. */
export function ChatHooksDemo() {
  const tr = useDemoText();
  const ref = useRef<AutoChatHandle>(null);
  const sequence = useRef(0);
  const [messages, setMessages] = useState<AutoChatMessage[]>([
    { id: "welcome", role: "assistant", content: tr("chat.welcome") },
  ]);
  const [draft, setDraft] = useState("");
  const [events, setEvents] = useState<
    { id: number; name: string; detail: string }[]
  >([]);
  const [failSend, setFailSend] = useState(false);
  const [failLoad, setFailLoad] = useState(false);
  const [generating, setGenerating] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const record = (name: string, detail = "") =>
    setEvents((old) => [
      ...old.slice(-39),
      { id: ++sequence.current, name, detail },
    ]);
  const cancel = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => () => cancel(), []);
  const stop = () => {
    cancel();
    setGenerating(false);
    setMessages((rows) => rows.map((row) => ({ ...row, streaming: false })));
    record("onStop");
  };
  return (
    <div className="chat-hooks-lab">
      <AutoChat
        ref={ref}
        messages={messages}
        value={draft}
        generating={generating}
        onStop={stop}
        header={
          <div className="chat-lab-header">
            <div className="chat-lab-toolbar">
              <label>
                <input
                  type="checkbox"
                  checked={failSend}
                  onChange={(e) => setFailSend(e.target.checked)}
                />
                {tr("chat.simulateError")}
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={failLoad}
                  onChange={(e) => setFailLoad(e.target.checked)}
                />
                {tr("chat.lab.failLoad")}
              </label>
              <button
                type="button"
                onClick={() => {
                  ref.current?.focusComposer();
                  record("focusComposer");
                }}
              >
                {tr("chat.lab.focus")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = ref.current?.getScrollElement();
                  record(
                    "getScrollElement",
                    el ? `${el.clientHeight}px / ${el.scrollHeight}px` : "null",
                  );
                }}
              >
                {tr("chat.lab.inspect")}
              </button>
              <button
                type="button"
                onClick={() =>
                  record(
                    "scrollToMessage",
                    String(ref.current?.scrollToMessage(messages[0].id)),
                  )
                }
              >
                {tr("chat.render.start")}
              </button>
              <button
                type="button"
                onClick={() => {
                  ref.current?.scrollToBottom();
                  record("scrollToBottom");
                }}
              >
                {tr("chat.render.end")}
              </button>
            </div>
            <p className="chat-lab-hint">{tr("chat.lab.hooksHint")}</p>
          </div>
        }
        onValueChange={(value) => {
          setDraft(value);
          record("onValueChange", `${value.length}`);
        }}
        onSend={async (text) => {
          record("onSend", text);
          if (failSend) {
            setFailSend(false);
            throw new Error("Simulated send failure");
          }
          const id = `reply-${++sequence.current}`;
          setMessages((rows) => [
            ...rows,
            { id: `user-${id}`, role: "user", content: text },
            { id, role: "assistant", content: "", streaming: true },
          ]);
          record("onSend:accepted");
          setGenerating(true);
          let progress = 0;
          const reply = tr("chat.reply");
          cancel();
          timer.current = setInterval(() => {
            progress += 2;
            const done = progress >= reply.length;
            setMessages((rows) =>
              rows.map((row) =>
                row.id === id
                  ? {
                      ...row,
                      content: reply.slice(0, progress),
                      streaming: !done,
                    }
                  : row,
              ),
            );
            if (done) {
              cancel();
              setGenerating(false);
              record("stream:complete");
            }
          }, 80);
        }}
        onSendError={() => record("onSendError")}
        hasMore
        onLoadOlder={async () => {
          record("onLoadOlder");
          if (failLoad) {
            setFailLoad(false);
            throw new Error("Simulated history failure");
          }
          setMessages((rows) => [
            {
              id: `older-${++sequence.current}`,
              role: "assistant",
              content: tr("chat.history"),
            },
            ...rows,
          ]);
          record("onLoadOlder:accepted");
        }}
        onLoadError={() => record("onLoadError")}
        renderActions={(message) => (
          <button
            type="button"
            onClick={() => record("renderActions:onClick", message.id)}
          >
            {tr("chat.lab.action")}
          </button>
        )}
      />
      <details className="chat-lab-events" open>
        <summary>
          {tr("chat.lab.events")} ({events.length})
        </summary>
        <button type="button" onClick={() => setEvents([])}>
          {tr("chat.lab.clear")}
        </button>
        <ol aria-label={tr("chat.lab.events")}>
          {events.length ? (
            [...events].reverse().map((event) => (
              <li key={event.id}>
                <code>{event.name}</code>
                {event.detail && <span> · {event.detail}</span>}
              </li>
            ))
          ) : (
            <li>{tr("chat.lab.emptyEvents")}</li>
          )}
        </ol>
      </details>
    </div>
  );
}
