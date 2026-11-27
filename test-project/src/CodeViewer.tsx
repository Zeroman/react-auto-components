import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AutoDialog } from "@zeroman.yang/react-auto-components";
import { useDemoText } from "./i18n";
import { useMediaQuery } from "./useMediaQuery";

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
    "./examples/TreeTableDemo.tsx",
    "./examples/ExpandedRowsDemo.tsx",
    "./examples/AutoHeightDemo.tsx",
    "./examples/FormDemo.tsx",
    "./examples/RacLiveDemo.tsx",
    "./examples/RacDemoControls.tsx",
    "./examples/SearchDemo.tsx",
    "./examples/DialogDemo.tsx",
    "./examples/TabsDemo.tsx",
    "./examples/TabsOverflowDemo.tsx",
    "./examples/TabsEqualDemo.tsx",
    "./examples/DynamicTabsDemo.tsx",
    "./examples/TabsStateDemo.tsx",
    "./examples/TabsFocusDemo.tsx",
    "./examples/MenuDemo.tsx",
    "./examples/PermissionsDemo.tsx",
    "./examples/mock/access.ts",
    "./examples/NavigationDemo.tsx",
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

type SourceGroupId = "examples" | "server" | "permissions";

type SourceGroup = {
  id: SourceGroupId;
  labelKey: string;
  files: readonly string[];
};

const baseExampleFiles: Record<string, readonly string[]> = {
  chat: [
    "ChatDemo.tsx",
    "ChatRenderers.tsx",
    "ChatTaskCard.tsx",
    "ChatPerformanceDemo.tsx",
    "ChatRenderingDemo.tsx",
    "ChatHooksDemo.tsx",
    "ChatStateDemo.tsx",
  ],
  table: [
    "TableDemo.tsx",
    "TreeTableDemo.tsx",
    "ExpandedRowsDemo.tsx",
    "AutoHeightDemo.tsx",
  ],
  form: ["FormDemo.tsx", "RacLiveDemo.tsx", "RacDemoControls.tsx"],
  search: ["SearchDemo.tsx", "RacLiveDemo.tsx", "RacDemoControls.tsx"],
  dialog: ["DialogDemo.tsx"],
  tabs: [
    "TabsDemo.tsx",
    "TabsOverflowDemo.tsx",
    "TabsEqualDemo.tsx",
    "DynamicTabsDemo.tsx",
    "TabsStateDemo.tsx",
    "TabsFocusDemo.tsx",
  ],
  menu: ["MenuDemo.tsx"],
  "tree-demo": ["NavigationDemo.tsx"],
};

const serverPageNames: Record<string, string> = {
  table: "Table",
  form: "Form",
  search: "Search",
  dialog: "Dialog",
  tabs: "Tabs",
  menu: "Menu",
  chat: "Chat",
};

const exampleGroups: Record<string, readonly SourceGroup[]> = Object.fromEntries(
  Object.entries(baseExampleFiles).map(([page, files]) => {
    const groups: SourceGroup[] = [
      { id: "examples", labelKey: "Component examples", files },
    ];
    const serverName = serverPageNames[page];
    if (serverName) {
      groups.push({
        id: "server",
        labelKey: "Server mock",
        files: [`mock/Server${serverName}Demo.tsx`, "mock/MockDemo.tsx"],
      });
      groups.push({
        id: "permissions",
        labelKey: "Permissions",
        files: ["PermissionsDemo.tsx", "mock/access.ts"],
      });
    }
    return [page, groups];
  }),
);

const defaultFileByExample: Record<string, Record<string, string>> = {
  table: {
    local: "TableDemo.tsx",
    large: "TableDemo.tsx",
    tree: "TreeTableDemo.tsx",
    expanded: "ExpandedRowsDemo.tsx",
    "auto-height": "AutoHeightDemo.tsx",
  },
  form: {
    component: "FormDemo.tsx",
    rac: "RacLiveDemo.tsx",
  },
  search: {
    instant: "SearchDemo.tsx",
    manual: "SearchDemo.tsx",
    advanced: "SearchDemo.tsx",
    remote: "SearchDemo.tsx",
    rac: "RacLiveDemo.tsx",
  },
  tabs: {
    basic: "TabsDemo.tsx",
    overflow: "TabsOverflowDemo.tsx",
    equal: "TabsEqualDemo.tsx",
    dynamic: "DynamicTabsDemo.tsx",
    access: "TabsStateDemo.tsx",
    focus: "TabsFocusDemo.tsx",
  },
  chat: {
    conversation: "ChatDemo.tsx",
    performance: "ChatPerformanceDemo.tsx",
    rendering: "ChatRenderingDemo.tsx",
    layouts: "ChatStateDemo.tsx",
    hooks: "ChatHooksDemo.tsx",
    edges: "ChatStateDemo.tsx",
  },
  dialog: {
    component: "DialogDemo.tsx",
  },
  menu: {
    component: "MenuDemo.tsx",
  },
  "tree-demo": {
    details: "NavigationDemo.tsx",
  },
};

function resolveDefaultFile(
  page: string,
  example: string | undefined,
  groups: readonly SourceGroup[],
  serverDriven: boolean,
  permissions: boolean,
): string {
  const allFiles = groups.flatMap((group) => group.files);
  if ((example === "permissions" || permissions) && allFiles.includes("PermissionsDemo.tsx")) {
    return "PermissionsDemo.tsx";
  }
  if (example === "server" || serverDriven) {
    const serverFile = groups.find((group) => group.id === "server")?.files[0];
    if (serverFile) return serverFile;
  }
  const mapped = example ? defaultFileByExample[page]?.[example] : undefined;
  if (mapped && allFiles.includes(mapped)) return mapped;
  return allFiles[0] ?? "";
}

function renderFileLabel(name: string) {
  const slash = name.lastIndexOf("/");
  if (slash < 0) return <span className="code-file-name">{name}</span>;
  return (
    <>
      <span className="code-file-dir">{name.slice(0, slash + 1)}</span>
      <span className="code-file-name">{name.slice(slash + 1)}</span>
    </>
  );
}

type CodeViewerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: string;
  example?: string;
  title: string;
  serverDriven?: boolean;
  permissions?: boolean;
};

export function CodeViewer({
  open,
  onOpenChange,
  page,
  example,
  title,
  serverDriven = false,
  permissions = false,
}: CodeViewerProps) {
  const tr = useDemoText();
  const isMobile = useMediaQuery("(max-width: 700px)");
  const groups = exampleGroups[page] ?? [];
  const files = groups.flatMap((group) => group.files);
  const defaultName = resolveDefaultFile(
    page,
    example,
    groups,
    serverDriven,
    permissions,
  );
  const [activeName, setActiveName] = useState(defaultName);
  const [copied, setCopied] = useState(false);
  const [preScroll, setPreScroll] = useState({ left: false, right: false });
  const preRef = useRef<HTMLPreElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const currentName = files.includes(activeName)
    ? activeName
    : (defaultName || files[0] || "");
  const code = currentName
    ? (rawSources[`./examples/${currentName}`] ?? "")
    : "";
  const lineCount = code ? code.split("\n").length : 0;

  const updatePreScroll = useCallback(() => {
    const el = preRef.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setPreScroll((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right },
    );
  }, []);

  useEffect(() => {
    setActiveName(defaultName);
    setCopied(false);
  }, [open, page, defaultName]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = 0;
      preRef.current.scrollLeft = 0;
    }
    updatePreScroll();
    const el = preRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updatePreScroll);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, currentName, updatePreScroll]);

  useEffect(() => {
    if (!open || isMobile || !sidebarRef.current) return;
    const activeButton = sidebarRef.current.querySelector<HTMLButtonElement>(
      'button[data-code-file][aria-pressed="true"]',
    );
    activeButton?.scrollIntoView({ block: "nearest" });
  }, [open, currentName, isMobile]);

  const selectFile = (name: string) => {
    setActiveName(name);
    setCopied(false);
  };

  const handleSidebarKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }
    const buttons = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "button[data-code-file]",
      ),
    ];
    if (buttons.length === 0) return;
    const currentIndex = buttons.indexOf(
      event.target as HTMLButtonElement,
    );
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % buttons.length;
    } else if (event.key === "ArrowUp") {
      nextIndex =
        currentIndex < 0
          ? buttons.length - 1
          : (currentIndex - 1 + buttons.length) % buttons.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = buttons.length - 1;
    }
    event.preventDefault();
    buttons[nextIndex]?.focus();
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard permission is optional in some embedded browsers.
    }
  };

  const showSidebar = !isMobile && files.length > 1;
  const showMobileSelect = isMobile && files.length > 1;

  return (
    <AutoDialog
      open={open && files.length > 0}
      onOpenChange={onOpenChange}
      title={`${title} · ${tr("Example source")}`}
      width={1020}
      hideFooter
      content={
        <div
          className="code-viewer"
          data-testid="code-viewer"
          data-layout={isMobile ? "compact" : "split"}
        >
          {showSidebar && (
            <aside className="code-file-sidebar">
              <nav
                ref={sidebarRef}
                aria-label={tr("Source files")}
                onKeyDown={handleSidebarKeyDown}
              >
                {groups.map((group) => (
                  <section className="code-file-group" key={group.id}>
                    <div className="code-file-group-title">
                      {tr(group.labelKey)}
                    </div>
                    <ul className="code-file-list">
                      {group.files.map((name) => {
                        const isActive = name === currentName;
                        return (
                          <li key={name}>
                            <button
                              type="button"
                              data-code-file={name}
                              aria-label={name}
                              aria-pressed={isActive}
                              aria-current={isActive ? "true" : undefined}
                              title={name}
                              className={
                                isActive
                                  ? "code-file-item active"
                                  : "code-file-item"
                              }
                              onClick={() => selectFile(name)}
                            >
                              {renderFileLabel(name)}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </nav>
            </aside>
          )}
          <div className="code-viewer-pane">
            <div className="code-viewer-toolbar">
              {showMobileSelect ? (
                <select
                  className="code-file-select"
                  aria-label={tr("Source files")}
                  value={currentName}
                  onChange={(event) => selectFile(event.target.value)}
                >
                  {groups.map((group) => (
                    <optgroup key={group.id} label={tr(group.labelKey)}>
                      {group.files.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              ) : (
                <div className="code-viewer-meta">
                  <code className="code-viewer-path" title={currentName}>
                    {currentName}
                  </code>
                  <span className="code-viewer-lines">
                    {lineCount} {tr("lines")}
                  </span>
                </div>
              )}
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
            <div
              className="code-viewer-pre-wrap"
              data-scroll-left={preScroll.left ? "true" : undefined}
              data-scroll-right={preScroll.right ? "true" : undefined}
            >
              <pre
                ref={preRef}
                className="code-viewer-pre"
                tabIndex={0}
                aria-label={currentName}
                onScroll={updatePreScroll}
              >
                <code>{code}</code>
              </pre>
            </div>
          </div>
        </div>
      }
    />
  );
}
