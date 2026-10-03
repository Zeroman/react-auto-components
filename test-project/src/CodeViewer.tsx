import { useEffect, useState } from "react";
import { AutoDialog } from "@zeroman.yang/react-auto-components";
import { useDemoText } from "./i18n";

// Only these reviewed examples may be embedded in the public demo.
const rawSources = import.meta.glob<string>(
  [
    "./examples/TableDemo.tsx",
    "./examples/ChatDemo.tsx",
    "./examples/ChatRenderers.tsx",
    "./examples/ChatTaskCard.tsx",
    "./examples/ChatPerformanceDemo.tsx",
    "./examples/ChatRenderingDemo.tsx",
    "./examples/ChatHooksDemo.tsx",
    "./examples/ChatStateDemo.tsx",
    "./examples/AdvancedTableDemo.tsx",
    "./examples/AutoHeightDemo.tsx",
    "./examples/FormDemo.tsx",
    "./examples/SearchDemo.tsx",
    "./examples/DialogDemo.tsx",
    "./examples/TabsDemo.tsx",
    "./examples/DynamicTabsDemo.tsx",
    "./examples/TabsStateDemo.tsx",
    "./examples/MenuDemo.tsx",
    "./examples/NavigationDemo.tsx",
    "./examples/ServerDrivenDemo.tsx",
    "./examples/mock/MockDemo.tsx",
    "./examples/mock/ServerTableDemo.tsx",
    "./examples/mock/ServerFormDemo.tsx",
    "./examples/mock/ServerSearchDemo.tsx",
    "./examples/mock/ServerDialogDemo.tsx",
    "./examples/mock/ServerTabsDemo.tsx",
    "./examples/mock/ServerMenuDemo.tsx",
    "./examples/mock/ServerChatDemo.tsx",
  ],
  { query: "?raw", import: "default", eager: true },
);

const sourceUrl =
  "https://github.com/Zeroman/react-auto-components/blob/main/test-project/src/examples";

const exampleFiles: Record<string, readonly string[]> = {
  chat: [
    "ChatDemo.tsx",
    "ChatRenderers.tsx",
    "ChatTaskCard.tsx",
    "ChatPerformanceDemo.tsx",
    "ChatRenderingDemo.tsx",
    "ChatHooksDemo.tsx",
    "ChatStateDemo.tsx",
  ],
  table: ["TableDemo.tsx", "AdvancedTableDemo.tsx", "AutoHeightDemo.tsx"],
  form: ["FormDemo.tsx"],
  search: ["SearchDemo.tsx"],
  dialog: ["DialogDemo.tsx"],
  tabs: ["TabsDemo.tsx", "DynamicTabsDemo.tsx", "TabsStateDemo.tsx"],
  menu: ["MenuDemo.tsx"],
  "tree-demo": ["NavigationDemo.tsx"],
};

for (const [page, name] of Object.entries({
  table: "Table",
  form: "Form",
  search: "Search",
  dialog: "Dialog",
  tabs: "Tabs",
  menu: "Menu",
  chat: "Chat",
})) {
  exampleFiles[page] = [
    ...exampleFiles[page],
    `mock/Server${name}Demo.tsx`,
    "mock/MockDemo.tsx",
  ];
}

exampleFiles.table = [...exampleFiles.table, "mock/ServerSearchDemo.tsx"];

type CodeViewerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: string;
  title: string;
  serverDriven?: boolean;
};

export function CodeViewer({
  open,
  onOpenChange,
  page,
  title,
  serverDriven = false,
}: CodeViewerProps) {
  const tr = useDemoText();
  const files = exampleFiles[page] ?? [];
  const defaultName =
    (serverDriven
      ? files.find((name) => name.startsWith("mock/Server"))
      : files[0]) ?? "";
  const [activeName, setActiveName] = useState(defaultName);
  const [copied, setCopied] = useState(false);
  const currentName = files.includes(activeName)
    ? activeName
    : (files[0] ?? "");
  const code = currentName
    ? (rawSources[`./examples/${currentName}`] ?? "")
    : "";

  useEffect(() => {
    setActiveName(defaultName);
    setCopied(false);
  }, [open, page, defaultName]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard permission is optional in some embedded browsers.
    }
  };

  return (
    <AutoDialog
      open={open && files.length > 0}
      onOpenChange={onOpenChange}
      title={`${title} · ${tr("Example source")}`}
      width={880}
      hideFooter
      content={
        <div className="code-viewer" data-testid="code-viewer">
          <div className="code-viewer-toolbar">
            <div className="code-file-tabs">
              {files.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={name === currentName}
                  className={name === currentName ? "active" : ""}
                  onClick={() => {
                    setActiveName(name);
                    setCopied(false);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="code-viewer-actions">
              <button type="button" onClick={copyCode}>
                {copied ? tr("Copied") : tr("Copy code")}
              </button>
              {currentName && (
                <a
                  href={`${sourceUrl}/${currentName}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {tr("View on GitHub")}
                </a>
              )}
            </div>
          </div>
          <pre
            className="code-viewer-pre"
            tabIndex={0}
            aria-label={currentName}
          >
            <code>{code}</code>
          </pre>
        </div>
      }
    />
  );
}
