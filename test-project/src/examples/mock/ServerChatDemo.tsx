import { useEffect, useRef, useState } from "react";
import { AutoChat } from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../../i18n";
import { MockDemo, mockRequest, type MockScenario } from "./MockDemo";

interface Message {
  id: string;
  role: "assistant" | "user";
  text: string;
  translated?: boolean;
}
interface ChatResponse {
  conversationId: string;
  permissions: { send: boolean };
  history: Message[];
  replyPrefix: string;
  maxLength: number;
}
const loadChat = (scenario: MockScenario, signal: AbortSignal) =>
  mockRequest<ChatResponse>(
    {
      conversationId: `support-${scenario}`,
      permissions: { send: scenario !== "restricted" },
      history:
        scenario === "empty"
          ? []
          : [
              {
                id: "welcome",
                role: "assistant",
                text: "mock.chat.welcome",
                translated: true,
              },
              {
                id: "question",
                role: "user",
                text: "mock.chat.question",
                translated: true,
              },
              {
                id: "answer",
                role: "assistant",
                text: "mock.chat.answer",
                translated: true,
              },
            ],
      replyPrefix: "mock.chat.reply",
      maxLength: 500,
    },
    { signal },
  );
export function ServerChatDemo() {
  return (
    <MockDemo
      title="mock.chat.title"
      description="mock.chat.description"
      load={loadChat}
    >
      {({ data }) => <Conversation data={data} />}
    </MockDemo>
  );
}
function Conversation({ data }: { data: ChatResponse }) {
  const tr = useDemoText();
  const [messages, setMessages] = useState(data.history);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [composerRevision, setComposerRevision] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [exchange, setExchange] = useState<unknown>(null);
  const currentRequest = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      currentRequest.current?.abort();
    },
    [],
  );
  const send = async (text: string) => {
    if (!data.permissions.send) return;
    if (text.length > data.maxLength)
      throw new Error(tr("mock.chat.tooLong", [data.maxLength]));
    currentRequest.current?.abort();
    const controller = new AbortController();
    currentRequest.current = controller;
    const request = { conversationId: data.conversationId, text };
    setExchange({ request, response: null });
    setPending(true);
    setCancelled(false);
    const fail = failNext;
    setFailNext(false);
    try {
      const id = crypto.randomUUID();
      const response = await mockRequest(
        {
          messages: [
            { id: `${id}-user`, role: "user" as const, text },
            {
              id: `${id}-assistant`,
              role: "assistant" as const,
              text: `${tr(data.replyPrefix)} ${text}`,
            },
          ],
        },
        { signal: controller.signal, fail, delay: 800 },
      );
      if (!controller.signal.aborted) {
        setMessages((rows) => [...rows, ...response.messages]);
        setExchange({ request, response });
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setExchange({ request, error: tr("mock.requestFailed") });
      throw error;
    } finally {
      if (currentRequest.current === controller) setPending(false);
    }
  };
  return (
    <div>
      <p>
        {tr(
          data.permissions.send ? "mock.chat.writable" : "mock.chat.readonly",
          [data.maxLength],
        )}
      </p>
      <AutoChat<Message>
        key={composerRevision}
        messages={messages}
        height={420}
        conversationKey={data.conversationId}
        composer={data.permissions.send}
        value={draft}
        onValueChange={setDraft}
        onSend={send}
        generating={pending}
        onStop={() => {
          // Reset AutoChat's pending submit lifecycle while keeping the controlled draft.
          setComposerRevision((value) => value + 1);
          currentRequest.current?.abort();
          setPending(false);
          setCancelled(true);
          setExchange({ cancelled: true });
        }}
        renderMessage={(message) => (
          <p>{message.translated ? tr(message.text) : message.text}</p>
        )}
        empty={<p>{tr("mock.chat.empty")}</p>}
        composerExtra={
          <label>
            <input
              type="checkbox"
              checked={failNext}
              onChange={(event) => setFailNext(event.target.checked)}
            />{" "}
            {tr("mock.chat.fail")}
          </label>
        }
        labels={{ sendError: tr("mock.chat.sendError") }}
      />
      {cancelled && <p role="status">{tr("mock.chat.cancelled")}</p>}
      <details open>
        <summary>{tr("mock.chat.exchange")}</summary>
        <pre data-testid="mock-chat-exchange">
          {JSON.stringify(exchange, null, 2)}
        </pre>
      </details>
    </div>
  );
}
