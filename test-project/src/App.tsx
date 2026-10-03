import { useMediaQuery } from "./useMediaQuery";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useDemoText, useDemoLanguage, LanguagePicker } from "./i18n";
import { GlobalSettings, defaultStudioSettings } from "./GlobalSettings";
import {
  AutoConfigProvider,
  AutoDialogProvider,
  AutoDialog,
  AutoMenu,
  AutoTabs,
  AutoNavigationProvider,
  useAutoNavigation,
  useAutoRoute,
  createHashHistory,
} from "@zeroman.yang/react-auto-components";
import { TableDemo } from "./examples/TableDemo";
import { FormDemo } from "./examples/FormDemo";
import { examplesFor } from "./demoNavigation";
import { SearchDemo, type SearchExampleKind } from "./examples/SearchDemo";
import { DialogDemo } from "./examples/DialogDemo";
import { TabsDemo } from "./examples/TabsDemo";
import { MenuDemo } from "./examples/MenuDemo";
import { ServerDrivenDemo } from "./examples/ServerDrivenDemo";
import { NavigationDemo } from "./examples/NavigationDemo";
const ChatDemo = lazy(() =>
  import("./examples/ChatDemo").then((module) => ({
    default: module.ChatDemo,
  })),
);
import { CodeViewer } from "./CodeViewer";

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const tableIcon = (
  <NavIcon>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
    <path d="M9 3v18" />
  </NavIcon>
);

const formIcon = (
  <NavIcon>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 8h10" />
    <path d="M7 12h10" />
    <path d="M7 16h6" />
  </NavIcon>
);

const searchIcon = (
  <NavIcon>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </NavIcon>
);

const dialogIcon = (
  <NavIcon>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
  </NavIcon>
);

const tabsIcon = (
  <NavIcon>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </NavIcon>
);

const chatIcon = (
  <NavIcon>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 9h8" />
    <path d="M8 13h5" />
  </NavIcon>
);

function SettingsIcon() {
  return (
    <NavIcon>
      <g transform="translate(12 12) scale(0.88) translate(-12 -12)">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </g>
    </NavIcon>
  );
}

const treeIcon = (
  <NavIcon>
    <circle cx="12" cy="5" r="2.5" />
    <line x1="12" y1="7.5" x2="12" y2="13" />
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M6 15.5V13h12v2.5" />
  </NavIcon>
);

const pages: ReadonlyArray<readonly [string, ReactNode, string, string]> = [
  ["table", tableIcon, "AutoTable", "Smart table"],
  ["form", formIcon, "AutoForm", "Dynamic form"],
  ["search", searchIcon, "AutoSearch", "Search panel"],
  ["dialog", dialogIcon, "AutoDialog", "Dialog"],
  ["tabs", tabsIcon, "AutoTabs", "Tab navigation"],
  ["menu", tabsIcon, "AutoMenu", "mock.menuPage"],
  ["chat", chatIcon, "AutoChat", "chat.title"],
  ["tree-demo", treeIcon, "AutoNav", "Component Tree Navigation"],
];

function AppContent() {
  const tr = useDemoText();
  const { translate } = useDemoLanguage();
  const narrowMenu = useMediaQuery("(max-width: 700px)");
  const nav = useAutoNavigation();
  const [role, setRole] = useState<string>("admin");
  const [settings, setSettings] = useState(defaultStudioSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  // Top-level route declaration for known pages
  useAutoRoute({
    children: [
      ...pages.map(([id]) => ({
        id,
        defaultChild: examplesFor(id)[0][0],
      })),
      { id: "tree-demo", defaultChild: "details" },
    ],
    defaultChild: "table",
  });

  const page = nav.path[0] || "table";
  const example = nav.path[1] || examplesFor(page)?.[0]?.[0] || "local";
  const serverExample = example === "server";

  const exampleLabel = (id: string, label: string) =>
    id === "remote" ? `${tr(label)} (Mock)` : tr(label);
  const fillHeight = true;

  useEffect(() => {
    document.documentElement.classList.toggle("studio-dark", settings.dark);
  }, [settings.dark]);

  return (
    <AutoConfigProvider
      config={{
        namespace: "auto-studio",
        t: translate,
        canAccess: (access) => (access.roles ? access.roles.includes(role) : true),
        size: settings.size,
        density: settings.density,
        table: {
          density: settings.tableDensity,
          size: settings.size,
        },
        tabs: {
          density: settings.tabsDensity,
          size: settings.size,
        },
        form: settings.form,
      }}
    >
      <AutoDialogProvider>
        <div
          className={`studio ${settings.dark ? "studio-dark" : ""} ${fillHeight ? "studio-fill" : ""}`}
          data-size={settings.size}
        >
          <aside>
            <AutoMenu
              collapsed={narrowMenu}
              label={tr("Component workspace")}
              header={
                <a
                  className="brand"
                  href="#"
                  onClick={(e) => e.preventDefault()}
                >
                  <span className="brand-mark">A</span>
                  <strong>
                    Auto<span>Studio</span>
                  </strong>
                </a>
              }
              footer={
                <div className="sidebar-footer">
                  <span className="online-dot" />
                  React 19.3 · TanStack 9
                  <small>
                    {tr("Standalone Component Test Project / v0.1.0")}
                  </small>
                </div>
              }
              items={[
                ...pages.map(([id, icon, name, label]) => {
                  if (id === "tree-demo") {
                    return {
                      id,
                      label: name,
                      icon,
                      description: tr(label),
                      target: "tree-demo:details",
                    };
                  }
                  return {
                    id,
                    label: name,
                    icon,
                    description: tr(label),
                    children: examplesFor(id).map(
                      ([exampleId, exampleTitle]) => ({
                        id: `${id}/${exampleId}`,
                        label: exampleLabel(exampleId, exampleTitle),
                        target: `${id}:${exampleId}`,
                      }),
                    ),
                  };
                }),
                {
                  id: "settings",
                  label: tr("Global settings"),
                  icon: <SettingsIcon />,
                  description: tr("Layout & appearance"),
                },
              ]}
              onChange={(id) => {
                if (id === "settings") setSettingsOpen(true);
              }}
            />
          </aside>
          <div className="studio-main">
            <header className="topbar">
              <span>
                {tr("Component Lab")}{" "}
                <span className="breadcrumb">
                  / {pages.find((p) => p[0] === page)?.[2] ?? page}
                </span>
              </span>
              <div className="auto-actions">
                <LanguagePicker />
                <span
                  className="version-pill"
                  title={tr("Global Component Size")}
                >
                  {tr("Size:  {0}", [
                    settings.size === "small"
                      ? tr("Small (S)")
                      : settings.size === "large"
                        ? tr("Large (L)")
                        : tr("Medium (M)"),
                  ])}
                </span>
                <span
                  className="version-pill"
                  title={tr("Global Table Density")}
                >
                  {tr("Table:  {0}", [
                    settings.tableDensity === "compact"
                      ? tr("Compact")
                      : settings.tableDensity === "comfortable"
                        ? tr("Comfortable")
                        : tr("Standard"),
                  ])}
                </span>
                <span
                  className="version-pill"
                  title={tr("Global Tabs Density")}
                >
                  {tr("Tabs: {0}", [
                    settings.tabsDensity === "compact"
                      ? tr("Compact")
                      : tr("Comfortable"),
                  ])}
                </span>
                <button
                  onClick={() => setSettingsOpen(true)}
                  aria-label={tr("Open Global Settings")}
                >
                  <SettingsIcon />
                </button>
                <span className="avatar">AS</span>
              </div>
            </header>
            <main
              data-page={page}
              data-example={serverExample ? "server" : "component"}
            >
              <div className="page-heading">
                <h1>{tr(pages.find((p) => p[0] === page)?.[3] ?? page)}</h1>
                <button
                  type="button"
                  className="code-button"
                  onClick={() => setCodeOpen(true)}
                >
                  <span aria-hidden="true">{"</>"}</span>
                  {tr("View code")}
                </button>
              </div>

              {/* Component Navigation Showcase toolbar */}
              <div
                className="demo-navigation-bar"
                data-testid="demo-navigation-bar"
              >
                <span style={{ fontWeight: 600 }}>{tr("Navigation Tree:")}</span>
                <span className="version-pill" data-testid="nav-path-badge">
                  path: <strong>{nav.path.join(":") || "/"}</strong>
                </span>
                {Object.keys(nav.params).length > 0 && (
                  <span className="version-pill" data-testid="nav-params-badge">
                    params: <strong>{JSON.stringify(nav.params)}</strong>
                  </span>
                )}
                <button
                  type="button"
                  className="code-button"
                  style={{ height: "22px", padding: "0 6px", fontSize: "11px" }}
                  data-testid="nav-goto-large"
                  onClick={() => nav.goto("table:large")}
                >
                  {tr("Global:")} table:large
                </button>
                <button
                  type="button"
                  className="code-button"
                  style={{ height: "22px", padding: "0 6px", fontSize: "11px" }}
                  data-testid="nav-goto-chat-perf"
                  onClick={() => nav.goto("chat:performance")}
                >
                  {tr("Global:")} chat:performance
                </button>
                <button
                  type="button"
                  className="code-button"
                  style={{ height: "22px", padding: "0 6px", fontSize: "11px" }}
                  data-testid="nav-goto-deep-search"
                  onClick={() =>
                    nav.goto("search:instant", {
                      params: { query: "audit", status: "active" },
                    })
                  }
                >
                  {tr("Deep:")} search:instant?query=audit
                </button>
                <button
                  type="button"
                  className="code-button"
                  style={{ height: "22px", padding: "0 6px", fontSize: "11px" }}
                  data-testid="nav-relative-server"
                  onClick={() => nav.goto("./server", { basePath: [page] })}
                >
                  {tr("Relative:")} ./server
                </button>
                <button
                  type="button"
                  className="code-button"
                  style={{ height: "22px", padding: "0 6px", fontSize: "11px" }}
                  data-testid="nav-goto-tree-demo"
                  onClick={() =>
                    nav.goto("tree-demo:details", {
                      params: { projectId: "42", tab: "specs" },
                    })
                  }
                >
                  {tr("Tree Demo Node")}
                </button>
                <button
                  type="button"
                  className="code-button"
                  style={{ height: "22px", padding: "0 6px", fontSize: "11px" }}
                  data-testid="nav-toggle-role"
                  onClick={() =>
                    setRole((r) => (r === "admin" ? "guest" : "admin"))
                  }
                >
                  {tr("Role")}: <strong>{role}</strong>
                </button>
              </div>

              {page !== "tree-demo" && (
                <div className="demo-navigation">
                  <AutoTabs
                    route={{ name: page, defaultChild: examplesFor(page)[0][0] }}
                    keepMounted={false}
                    items={examplesFor(page).map(([id, label]) => ({
                      id,
                      label: exampleLabel(id, label),
                      tip:
                        page === "table" && id === "remote"
                          ? tr(
                              "Mock server: sorting, filtering and pagination run asynchronously in the browser. No backend required.",
                            )
                          : undefined,
                    }))}
                  />
                </div>
              )}
              <div className="demo-viewport">
                {page === "tree-demo" ? (
                  <NavigationDemo
                    role={role}
                    onToggleRole={() => setRole((r) => (r === "admin" ? "guest" : "admin"))}
                  />
                ) : serverExample ? (
                  <ServerDrivenDemo component={page} />
                ) : page === "menu" ? (
                  <MenuDemo />
                ) : page === "table" ? (
                  <TableDemo mode={example} />
                ) : page === "form" ? (
                  <FormDemo />
                ) : page === "search" ? (
                  <SearchDemo example={example as SearchExampleKind} />
                ) : page === "dialog" ? (
                  <DialogDemo />
                ) : page === "chat" ? (
                  <Suspense
                    fallback={<div role="status">{tr("chat.loading")}</div>}
                  >
                    <ChatDemo mode={example} />
                  </Suspense>
                ) : (
                  <TabsDemo example={example} />
                )}
              </div>
              <footer className="page-footer">
                <span>Auto Studio — Build with clarity.</span>
                <span>
                  {tr(
                    "Tested against npm build artifacts · No source path aliases",
                  )}
                </span>
              </footer>
            </main>
          </div>
        </div>
        <AutoDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          title={tr("Global settings")}
          width={500}
          hideFooter
          content={<GlobalSettings value={settings} onChange={setSettings} />}
        />
        <CodeViewer
          open={codeOpen}
          serverDriven={serverExample}
          onOpenChange={setCodeOpen}
          page={page}
          title={tr(pages.find((p) => p[0] === page)?.[3] ?? "")}
        />
      </AutoDialogProvider>
    </AutoConfigProvider>
  );
}

export function App() {
  const initialExample =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("demo") === "auto-height"
      ? "auto-height"
      : "local";
  const initialPath = ["table", initialExample];

  return (
    <AutoNavigationProvider
      initialPath={initialPath}
      history={createHashHistory()}
    >
      <AppContent />
    </AutoNavigationProvider>
  );
}
