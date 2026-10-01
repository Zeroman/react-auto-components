import { useEffect, useRef, useState } from "react";
import {
  AutoChat,
  type AutoChatMessage,
  type AutoChatMessageLayout,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";
import { ChatMessageContent, MarkdownMessage } from "./ChatRenderers";
import { ChatTaskCard } from "./ChatTaskCard";
import workflowImage from "../assets/chat-workflow.svg";

const scenarios = [
  "mixed",
  "long",
  "wide",
  "nested",
  "unicode",
  "dynamic",
  "streaming",
  "safety",
] as const;
type Scenario = (typeof scenarios)[number];
const layouts = ["role", "left", "right", "full"] as const;
export function ChatLayoutPicker({
  value,
  onChange,
}: {
  value: AutoChatMessageLayout;
  onChange: (next: AutoChatMessageLayout) => void;
}) {
  const tr = useDemoText();
  return (
    <label>
      {tr("chat.lab.layout")}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AutoChatMessageLayout)}
      >
        {layouts.map((layout) => (
          <option key={layout} value={layout}>
            {tr(`chat.lab.${layout}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

function DynamicContent() {
  const tr = useDemoText();
  const [imageVisible, setImageVisible] = useState(false);
  return (
    <div className="chat-lab-stack">
      <details className="chat-lab-disclosure">
        <summary>{tr("chat.lab.expand")}</summary>
        <div className="chat-lab-expansion">
          {Array.from({ length: 12 }, (_, i) => (
            <p key={i}>
              {i + 1}. {tr("chat.lab.paragraph")}
            </p>
          ))}
        </div>
      </details>
      <div className="chat-lab-image">
        <button type="button" onClick={() => setImageVisible((v) => !v)}>
          {tr("chat.lab.image")}
        </button>
        {imageVisible && (
          <figure className="chat-render-image">
            <img src={workflowImage} alt={tr("chat.render.imageAlt")} />
          </figure>
        )}
      </div>
      <ChatTaskCard tr={tr} />
    </div>
  );
}
function streamText(tr: (key: string) => string) {
  const paragraph = tr("chat.lab.paragraph");
  return `## ${tr("chat.lab.streaming")}\n\n**${paragraph}**\n\n\`\`\`tsx\nconst conversation = { status: "streaming", count: 42 };\n\`\`\`\n\n| Markdown | React |\n| --- | --- |\n| 42 | 128 |\n\n- [x] ${paragraph}\n- [ ] ${paragraph}`;
}
function ScenarioContent({
  scenario,
  progress,
}: {
  scenario: Scenario;
  progress: number;
}) {
  const tr = useDemoText();
  const paragraph = tr("chat.lab.paragraph");
  const markdown = streamText(tr);
  switch (scenario) {
    case "long":
      return (
        <div className="chat-lab-stack">
          {Array.from({ length: 40 }, (_, i) => (
            <p key={i}>
              {i + 1}. {paragraph}
            </p>
          ))}
          <p className="chat-lab-long-token">
            {Array(30).fill("long_unbroken_identifier_0123456789").join("")}
          </p>
        </div>
      );
    case "wide":
      return (
        <div className="chat-lab-stack">
          <figure className="chat-render-code">
            <figcaption>TypeScript</figcaption>
            <pre>
              <code>{`const payload = "${"0123456789".repeat(60)}";\n${Array.from({ length: 12 }, (_, i) => `// ${i + 1}: ${paragraph}`).join("\n")}`}</code>
            </pre>
          </figure>
          <div className="chat-render-table">
            <table className="chat-lab-table">
              <thead>
                <tr>
                  {Array.from({ length: 12 }, (_, i) => (
                    <th key={i}>#{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }, (_, row) => (
                  <tr key={row}>
                    {Array.from({ length: 12 }, (_, col) => (
                      <td key={col}>{`row-${row + 1}-column-${col + 1}`}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case "nested":
      return (
        <MarkdownMessage
          text={`## ${tr("chat.lab.nested")}\n\n> ${paragraph}\n>\n> > **${paragraph}**\n\n1. ${paragraph}\n   - ${paragraph}\n     - \`inline code\`\n2. ${paragraph}\n\n- [x] ${paragraph}\n- [ ] ${paragraph}\n\n---\n\n${markdown}`}
        />
      );
    case "unicode":
      return (
        <div className="chat-lab-unicode">
          {[
            "العربية: مرحباً بالعالم 123 — English",
            "עברית: שלום עולם 456 — English",
            "中文 · 日本語 · 한국어",
            "👩🏽‍💻 🧑‍🚀 🏳️‍🌈 e\u0301 café 𝒜 ∑∞",
            paragraph,
          ].map((text) => (
            <p dir="auto" key={text}>
              {text}
            </p>
          ))}
        </div>
      );
    case "dynamic":
      return <DynamicContent />;
    case "streaming":
      return <MarkdownMessage text={markdown.slice(0, progress)} />;
    case "safety":
      return (
        <div>
          <p>{tr("chat.lab.safetyHint")}</p>
          <MarkdownMessage
            text={
              '<script>window.__chatUnsafe = true</script>\n\n<img src=x onerror="window.__chatUnsafe=true">\n\n[unsafe](javascript:alert(1))\n\n**Markdown**'
            }
          />
        </div>
      );
    default:
      return (
        <div className="chat-lab-stack">
          <MarkdownMessage
            text={`### ${tr("chat.lab.mixed")}\n\n${paragraph}`}
          />
          <ChatMessageContent
            message={{ id: "json", role: "tool", format: "json" }}
            tr={tr}
          />
          <ChatMessageContent
            message={{ id: "image", role: "assistant", format: "image" }}
            tr={tr}
          />
          <ChatTaskCard tr={tr} />
        </div>
      );
  }
}
const roles = ["user", "assistant", "system", "tool", "error"] as const;
export function ChatRenderingDemo() {
  const tr = useDemoText();
  const [scenario, setScenario] = useState<Scenario>("mixed");
  const [layout, setLayout] = useState<AutoChatMessageLayout>("role");
  const [virtual, setVirtual] = useState(false);
  const [revision, setRevision] = useState(0);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
  };
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  const reset = () => {
    stop();
    setProgress(0);
    setRevision((n) => n + 1);
  };
  const messages: AutoChatMessage[] = roles.map((role, i) => ({
    id: `lab-${i}`,
    role,
    avatar: role === "user" ? "U" : role === "assistant" ? "A" : undefined,
    content: tr("chat.lab.paragraph"),
  }));
  messages.push({ id: "lab-content", role: "assistant", streaming: running });
  return (
    <div className="chat-rendering-lab">
      <AutoChat
        messages={messages}
        messageLayout={layout}
        virtual={virtual}
        composer={false}
        conversationKey={`${scenario}-${revision}-${virtual}`}
        generating={running}
        header={
          <div className="chat-lab-header">
            <div className="chat-lab-toolbar">
              <label>
                {tr("chat.lab.scenario")}
                <select
                  value={scenario}
                  onChange={(e) => {
                    reset();
                    setScenario(e.target.value as Scenario);
                  }}
                >
                  {scenarios.map((name) => (
                    <option key={name} value={name}>
                      {tr(`chat.lab.${name}`)}
                    </option>
                  ))}
                </select>
              </label>
              <ChatLayoutPicker value={layout} onChange={setLayout} />
              <label>
                <input
                  type="checkbox"
                  checked={virtual}
                  onChange={(e) => setVirtual(e.target.checked)}
                />
                {tr("chat.lab.virtual")}
              </label>
              <button type="button" onClick={reset}>
                {tr("chat.lab.restart")}
              </button>
              {scenario === "streaming" && (
                <button
                  type="button"
                  onClick={() => {
                    if (running) {
                      stop();
                      return;
                    }
                    setProgress(0);
                    setRunning(true);
                    let next = 0;
                    const length = streamText(tr).length;
                    timer.current = setInterval(() => {
                      next = Math.min(next + 9, length);
                      setProgress(next);
                      if (next >= length) stop();
                    }, 50);
                  }}
                >
                  {tr(running ? "chat.stop" : "chat.render.stream")}
                </button>
              )}
            </div>
            <p className="chat-lab-hint">{tr("chat.lab.hint")}</p>
          </div>
        }
        renderMessage={(message) =>
          message.id === "lab-content" ? (
            <ScenarioContent
              key={`${scenario}-${revision}`}
              scenario={scenario}
              progress={progress}
            />
          ) : (
            message.content
          )
        }
      />
    </div>
  );
}
