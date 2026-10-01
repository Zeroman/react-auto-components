import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { useChatScroll } from "./useChatScroll";
import {
  VirtualChatMessages,
  type VirtualChatHandle,
} from "./VirtualChatMessages";
import type { AutoChatLabels, AutoChatMessage, AutoChatProps } from "./types";
import "./chat.css";
export type * from "./types";

const defaultLabels: AutoChatLabels = {
  conversation: "Conversation",
  empty: "Start a conversation",
  placeholder: "Write a message…",
  composer: "Message",
  send: "Send",
  stop: "Stop",
  sending: "Sending…",
  generating: "Generating…",
  latest: "Back to latest",
  loadOlder: "Load earlier messages",
  loading: "Loading…",
  sendError: "Message could not be sent. Try again.",
  loadError: "Earlier messages could not be loaded. Try again.",
  user: "You",
  assistant: "Assistant",
  system: "System",
  tool: "Tool",
  error: "Error",
};

export function AutoChat<T extends AutoChatMessage>(props: AutoChatProps<T>) {
  return <ChatContent key={props.conversationKey ?? "default"} {...props} />;
}

function ChatContent<T extends AutoChatMessage>({
  messages,
  renderMessage,
  renderActions,
  header,
  footer,
  empty,
  height = "100%",
  className = "",
  style,
  size,
  density,
  messageLayout = "role",
  labels: overrides,
  autoFollow = true,
  virtual = false,
  estimatedMessageHeight = 120,
  overscan = 6,
  composer = true,
  value,
  defaultValue = "",
  onValueChange,
  onSend,
  onSendError,
  onStop,
  generating = false,
  disabled = false,
  sendOnEnter = true,
  composerExtra,
  hasMore = false,
  loadingOlder = false,
  onLoadOlder,
  onLoadError,
  ref,
}: AutoChatProps<T>) {
  const services = useAutoConfig();
  const labels = Object.fromEntries(
    Object.entries(defaultLabels).map(([key, fallback]) => [
      key,
      overrides?.[key as keyof AutoChatLabels] ??
        services.t(`chat.${key}`, fallback),
    ]),
  ) as unknown as AutoChatLabels;
  const [local, setLocal] = useState(defaultValue);
  const draft = value ?? local;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const pendingSend = useRef(false);
  const pendingLoad = useRef(false);
  const alive = useRef(true);
  const composing = useRef(false);
  const editor = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();
  const virtualList = useRef<VirtualChatHandle>(null);
  const scroll = useChatScroll(autoFollow, virtual);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useImperativeHandle(ref, () => ({
    scrollToBottom: scroll.scrollToBottom,
    scrollToMessage: (id) => {
      const index = messages.findIndex((message) => message.id === id);
      if (index < 0) return false;
      scroll.pause();
      if (virtual) virtualList.current?.scrollToIndex(index);
      else {
        const row = scroll.content.current?.children[index];
        const el = scroll.viewport.current;
        if (row && el)
          el.scrollTop +=
            row.getBoundingClientRect().top - el.getBoundingClientRect().top;
      }
      return true;
    },
    focusComposer: () => editor.current?.focus(),
    getScrollElement: () => scroll.viewport.current,
  }));

  const change = (next: string) => {
    if (value === undefined) {
      draftRef.current = next;
      setLocal(next);
    }
    onValueChange?.(next);
    setSendFailed(false);
  };
  const submit = async () => {
    if (
      !onSend ||
      disabled ||
      generating ||
      pendingSend.current ||
      !draftRef.current.trim()
    )
      return;
    const submitted = draftRef.current;
    pendingSend.current = true;
    setSending(true);
    setSendFailed(false);
    try {
      await onSend(submitted);
      if (alive.current && draftRef.current === submitted) change("");
    } catch (error) {
      if (alive.current) {
        setSendFailed(true);
        onSendError?.(error);
      }
    } finally {
      pendingSend.current = false;
      if (alive.current) setSending(false);
    }
  };
  const loadOlder = async () => {
    if (!onLoadOlder || pendingLoad.current || loadingOlder) return;
    pendingLoad.current = true;
    setLoading(true);
    setLoadFailed(false);
    scroll.pause();
    try {
      await onLoadOlder();
    } catch (error) {
      if (alive.current) {
        setLoadFailed(true);
        onLoadError?.(error);
      }
    } finally {
      pendingLoad.current = false;
      if (alive.current) setLoading(false);
    }
  };

  const renderRow = (message: T, index: number) => (
    <article
      key={message.id}
      data-chat-id={message.id}
      className="auto-chat-message"
      data-role={message.role}
      aria-busy={message.streaming || undefined}
    >
      {message.avatar != null && (
        <div className="auto-chat-avatar">{message.avatar}</div>
      )}
      <div className="auto-chat-message-main">
        <div className="auto-chat-message-meta">
          <strong>{message.author ?? labels[message.role]}</strong>
          {message.meta}
          {message.streaming && (
            <span
              className="auto-chat-streaming"
              aria-label={labels.generating}
            >
              ●
            </span>
          )}
        </div>
        <div className="auto-chat-message-body">
          {renderMessage ? (
            renderMessage(message, { index })
          ) : typeof message.content === "string" ? (
            <div className="auto-chat-text">{message.content}</div>
          ) : (
            message.content
          )}
        </div>
        {renderActions && (
          <div className="auto-chat-message-actions">
            {renderActions(message, { index })}
          </div>
        )}
      </div>
    </article>
  );

  return (
    <section
      className={`auto-root auto-chat ${className}`.trim()}
      style={{ height, ...style }}
      data-size={size ?? services.size}
      data-density={density ?? services.density}
      data-message-layout={messageLayout}
      aria-label={labels.conversation}
    >
      {header != null && <header className="auto-chat-header">{header}</header>}
      <div className="auto-chat-history-shell">
        <div
          ref={scroll.viewport}
          className="auto-chat-history"
          role="log"
          aria-label={labels.conversation}
          aria-live="off"
          tabIndex={0}
          onScroll={scroll.onScroll}
          onWheel={(event) => {
            if (event.deltaY < 0) scroll.pause();
          }}
        >
          {hasMore && onLoadOlder && (
            <div className="auto-chat-history-start">
              <button
                type="button"
                onClick={() => {
                  void loadOlder();
                }}
                disabled={loading || loadingOlder}
              >
                {loading || loadingOlder ? labels.loading : labels.loadOlder}
              </button>
            </div>
          )}
          {loadFailed && (
            <p className="auto-error" role="alert">
              {labels.loadError}
            </p>
          )}
          {!messages.length && (
            <div className="auto-chat-empty">{empty ?? labels.empty}</div>
          )}
          {virtual ? (
            <VirtualChatMessages
              ref={virtualList}
              messages={messages}
              viewport={scroll.viewport}
              content={scroll.content}
              following={scroll.following}
              autoFollow={autoFollow}
              estimate={Math.max(24, estimatedMessageHeight)}
              overscan={Math.max(0, overscan)}
              renderRow={renderRow}
            />
          ) : (
            <div ref={scroll.content} className="auto-chat-messages">
              {messages.map(renderRow)}
            </div>
          )}
        </div>
        {scroll.showLatest && (
          <button
            type="button"
            className="auto-chat-latest"
            onClick={scroll.scrollToBottom}
          >
            {labels.latest} ↓
          </button>
        )}
      </div>
      <div className="auto-chat-status" role="status">
        {generating ? labels.generating : sending ? labels.sending : ""}
      </div>
      {composer && onSend && (
        <form
          className="auto-chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <textarea
            ref={editor}
            rows={3}
            value={draft}
            disabled={disabled}
            aria-label={labels.composer}
            placeholder={labels.placeholder}
            aria-describedby={sendFailed ? errorId : undefined}
            onChange={(event) => change(event.target.value)}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={(event) => {
              if (
                sendOnEnter &&
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.ctrlKey &&
                !event.altKey &&
                !event.metaKey &&
                !composing.current &&
                !event.nativeEvent.isComposing &&
                event.keyCode !== 229
              ) {
                event.preventDefault();
                void submit();
              }
            }}
          />
          {sendFailed && (
            <p id={errorId} className="auto-error" role="alert">
              {labels.sendError}
            </p>
          )}
          <div className="auto-chat-composer-actions">
            <div>{composerExtra}</div>
            {generating && onStop ? (
              <button type="button" onClick={onStop} disabled={disabled}>
                {labels.stop}
              </button>
            ) : (
              <button
                type="submit"
                className="auto-primary"
                disabled={disabled || sending || generating || !draft.trim()}
              >
                {sending ? labels.sending : labels.send}
              </button>
            )}
          </div>
        </form>
      )}
      {footer != null && <footer className="auto-chat-footer">{footer}</footer>}
    </section>
  );
}
