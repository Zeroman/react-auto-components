import { useEffect, useRef, useState } from "react";
import {
  AutoChat,
  type AutoChatMessageLayout,
  type AutoChatMessage,
} from "@zeroman/react-auto-components";
import { useDemoText } from "../i18n";
import { ChatLayoutPicker } from "./ChatRenderingDemo";

export function ChatLayoutDemo() {
  const tr = useDemoText();
  const [layout, setLayout] = useState<AutoChatMessageLayout>("role");
  const [avatars, setAvatars] = useState(true);
  const [virtual, setVirtual] = useState(false);
  const roles = ["user", "assistant", "system", "tool", "error"] as const;
  return (
    <div className="chat-rendering-lab">
      <AutoChat
        messageLayout={layout}
        virtual={virtual}
        conversationKey={String(virtual)}
        composer={false}
        header={
          <div className="chat-lab-toolbar">
            <ChatLayoutPicker value={layout} onChange={setLayout} />
            <label>
              <input
                type="checkbox"
                checked={avatars}
                onChange={(e) => setAvatars(e.target.checked)}
              />
              {tr("chat.lab.avatars")}
            </label>
            <label>
              <input
                type="checkbox"
                checked={virtual}
                onChange={(e) => setVirtual(e.target.checked)}
              />
              {tr("chat.lab.virtual")}
            </label>
          </div>
        }
        messages={roles.flatMap((role, index): AutoChatMessage[] => [
          {
            id: `${role}-short`,
            role,
            content: tr(`chat.${role}`),
            avatar: avatars ? String(index + 1) : undefined,
            meta: "09:41",
          },
          {
            id: `${role}-long`,
            role,
            content: tr("chat.lab.paragraph").repeat(4),
            avatar: avatars ? String(index + 1) : undefined,
            meta: "09:42",
          },
        ])}
      />
    </div>
  );
}
const edgeStates = [
  "empty",
  "readonly",
  "disabled",
  "controlled",
  "pending",
  "failure",
] as const;
/** A manual deferred promise makes race conditions repeatable without a network. */
export function ChatEdgeDemo() {
  const tr = useDemoText();
  const [mode, setMode] = useState<(typeof edgeStates)[number]>("empty");
  const [conversation, setConversation] = useState(0);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<AutoChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const activeConversation = useRef(0);
  const serial = useRef(0);
  const request = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.resolve();
    };
  }, []);
  const changeConversation = () => {
    activeConversation.current++;
    setConversation(activeConversation.current);
    setDraft("");
    setMessages(
      mode === "empty"
        ? []
        : [{ id: "initial", role: "assistant", content: tr("chat.welcome") }],
    );
  };
  return (
    <div className="chat-rendering-lab">
      <AutoChat
        messages={messages}
        conversationKey={conversation}
        value={draft}
        onValueChange={setDraft}
        disabled={mode === "disabled"}
        composer={mode !== "readonly"}
        header={
          <div className="chat-lab-header">
            <div className="chat-lab-toolbar">
              <label>
                {tr("chat.lab.scenario")}
                <select
                  value={mode}
                  onChange={(e) => {
                    request.current?.resolve();
                    request.current = null;
                    setPending(false);
                    const next = e.target.value as typeof mode;
                    setMode(next);
                    activeConversation.current++;
                    setConversation(activeConversation.current);
                    setDraft("");
                    setMessages(
                      next === "empty"
                        ? []
                        : [
                            {
                              id: "initial",
                              role: "assistant",
                              content: tr("chat.welcome"),
                            },
                          ],
                    );
                  }}
                >
                  {edgeStates.map((state) => (
                    <option key={state} value={state}>
                      {tr(`chat.lab.${state}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={changeConversation}>
                {tr("chat.reset")}
              </button>
              {mode === "controlled" && (
                <button
                  type="button"
                  onClick={() => setDraft(tr("chat.prompt"))}
                >
                  {tr("chat.lab.setDraft")}
                </button>
              )}
              {mode === "pending" && (
                <>
                  <button
                    type="button"
                    disabled={!pending}
                    onClick={() => {
                      request.current?.resolve();
                    }}
                  >
                    {tr("chat.lab.resolve")}
                  </button>
                  <button
                    type="button"
                    disabled={!pending}
                    onClick={() =>
                      request.current?.reject(new Error("Simulated rejection"))
                    }
                  >
                    {tr("chat.lab.reject")}
                  </button>
                </>
              )}
            </div>
            <p className="chat-lab-hint">{tr("chat.lab.edgeHint")}</p>
          </div>
        }
        onSend={async (text) => {
          if (mode === "failure") throw new Error("Simulated rejection");
          const origin = activeConversation.current;
          if (mode === "pending") {
            if (request.current)
              throw new Error("A previous request is still pending");
            setPending(true);
            try {
              await new Promise<void>((resolve, reject) => {
                request.current = { resolve, reject };
              });
            } finally {
              request.current = null;
              if (alive.current) setPending(false);
            }
          }
          if (alive.current && origin === activeConversation.current)
            setMessages((rows) => [
              ...rows,
              { id: `sent-${++serial.current}`, role: "user", content: text },
            ]);
        }}
      />
    </div>
  );
}
