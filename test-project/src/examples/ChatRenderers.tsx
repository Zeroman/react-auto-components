import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AutoChatMessage } from "@zeroman/react-auto-components";
import { ChatTaskCard } from "./ChatTaskCard";
import workflowImage from "../assets/chat-workflow.svg";

export const chatFormats = [
  "markdown",
  "code",
  "json",
  "table",
  "image",
  "component",
] as const;
export type ChatFormat = (typeof chatFormats)[number];
export interface DemoMessage extends AutoChatMessage {
  text?: string;
  textKey?: string;
  progress?: number;
  tool?: boolean;
  format?: ChatFormat;
}
type Translate = (key: string) => string;

export function MarkdownMessage({ text }: { text: string }) {
  return (
    <div className="chat-render-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}

/** The host chooses a renderer from structured data; message text is never executed. */
export function ChatMessageContent({
  message,
  tr,
}: {
  message: DemoMessage;
  tr: Translate;
}) {
  const text = message.textKey
    ? tr(message.textKey).slice(0, message.progress)
    : (message.text ?? "");
  switch (message.format) {
    case "markdown":
      return (
        <MarkdownMessage
          text={[
            `## ${tr("chat.render.markdownTitle")}`,
            tr("chat.render.markdownBody"),
            `| ${tr("chat.render.feature")} | ${tr("chat.render.status")} |\n| --- | --- |\n| Markdown | ${tr("chat.render.ready")} |\n| React | ${tr("chat.render.ready")} |`,
            `[${tr("chat.render.safeLink")}](https://github.com/Zeroman/react-auto-components)`,
          ].join("\n\n")}
        />
      );
    case "code":
      return (
        <figure className="chat-render-code">
          <figcaption>TypeScript</figcaption>
          <pre>
            <code>
              {
                'type Message = { id: string; content: string };\n\nconst reply: Message = {\n  id: "reply-1",\n  content: "Hello, AutoChat!",\n};\n\nconsole.log(reply.content);'
              }
            </code>
          </pre>
        </figure>
      );
    case "json":
      return (
        <details className="chat-render-json" open>
          <summary>JSON · {tr("chat.render.preview")}</summary>
          <pre>
            <code>
              {JSON.stringify(
                {
                  ok: true,
                  operation: "build",
                  durationMs: 128,
                  files: ["index.tsx", "styles.css"],
                  summary: { passed: 74, failed: 0 },
                },
                null,
                2,
              )}
            </code>
          </pre>
        </details>
      );
    case "table":
      return (
        <div className="chat-render-table">
          <table>
            <caption>{tr("chat.render.table")}</caption>
            <thead>
              <tr>
                <th>{tr("chat.render.feature")}</th>
                <th>{tr("chat.render.status")}</th>
                <th>ms</th>
              </tr>
            </thead>
            <tbody>
              {["Markdown", "JSON", "React"].map((name, index) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{tr("chat.render.ready")}</td>
                  <td>{[12, 3, 8][index]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "image":
      return (
        <figure className="chat-render-image">
          <img
            src={workflowImage}
            width={720}
            height={240}
            alt={tr("chat.render.imageAlt")}
            loading="lazy"
          />
          <figcaption>{tr("chat.render.imageCaption")}</figcaption>
        </figure>
      );
    case "component":
      return <ChatTaskCard tr={tr} />;
  }
  if (message.tool)
    return (
      <details>
        <summary>{tr("chat.toolSummary")}</summary>
        <p>{tr("chat.toolDetail")}</p>
        <code>{'{ "ok": true, "items": 3 }'}</code>
      </details>
    );
  return <MarkdownMessage text={text} />;
}
