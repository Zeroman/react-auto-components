import { useMediaQuery } from "./useMediaQuery";
import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useDemoText, useDemoLanguage } from "./i18n";
import { LanguagePicker } from "./DemoLanguage";
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
import { ServerTableDemo } from "./examples/mock/ServerTableDemo";
import { ServerFormDemo } from "./examples/mock/ServerFormDemo";
import { ServerSearchDemo } from "./examples/mock/ServerSearchDemo";
import { ServerDialogDemo } from "./examples/mock/ServerDialogDemo";
import { ServerTabsDemo } from "./examples/mock/ServerTabsDemo";
import { ServerMenuDemo } from "./examples/mock/ServerMenuDemo";
import { ServerChatDemo } from "./examples/mock/ServerChatDemo";
import {
  ChatPermissionsDemo,
  DialogPermissionsDemo,
  FormPermissionsDemo,
  MenuPermissionsDemo,
  PermissionsDemo,
  SearchPermissionsDemo,
  TabsPermissionsDemo,
  type PermissionsControls,
} from "./examples/PermissionsDemo";
import { useDemoAccess } from "./examples/mock/access";
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

function asSearchExample(example: string): SearchExampleKind {
  if (
    example === "instant" ||
    example === "manual" ||
    example === "advanced" ||
    example === "remote"
  ) {
    return example;
  }
  return "instant";
}

function PageExample({
  page,
  example,
  role,
  onToggleRole,
  permissions,
}: {
  page: string;
  example: string;
  role: string;
  onToggleRole: () => void;
  permissions: PermissionsControls;
}) {
  const tr = useDemoText();
  if (page === "tree-demo") {
    return <NavigationDemo role={role} onToggleRole={onToggleRole} />;
  }
  if (page === "table") {
    if (example === "permissions") return <PermissionsDemo {...permissions} />;
    if (example === "server") return <ServerTableDemo />;
    return <TableDemo mode={example} />;
  }
  if (page === "form") {
    if (example === "permissions")
      return <FormPermissionsDemo {...permissions} />;
    if (example === "server") return <ServerFormDemo />;
    return <FormDemo />;
  }
  if (page === "search") {
    if (example === "permissions")
      return <SearchPermissionsDemo {...permissions} />;
    if (example === "server") return <ServerSearchDemo />;
    return <SearchDemo example={asSearchExample(example)} />;
  }
  if (page === "dialog") {
    if (example === "permissions")
      return <DialogPermissionsDemo {...permissions} />;
    if (example === "server") return <ServerDialogDemo />;
    return <DialogDemo />;
  }
  if (page === "menu") {
    if (example === "permissions")
      return <MenuPermissionsDemo {...permissions} />;
    if (example === "server") return <ServerMenuDemo />;
    return <MenuDemo />;
  }
  if (page === "chat") {
    if (example === "permissions")
      return <ChatPermissionsDemo {...permissions} />;
    if (example === "server") return <ServerChatDemo />;
    return (
      <Suspense fallback={<div role="status">{tr("chat.loading")}</div>}>
        <ChatDemo mode={example} />
      </Suspense>
    );
  }
  if (page === "tabs") {
    if (example === "permissions")
      return <TabsPermissionsDemo {...permissions} />;
    if (example === "server") return <ServerTabsDemo />;
    return <TabsDemo example={example} />;
  }
  return null;
}

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
  globalThis.__racNav = nav;
  const {
    access,
    status: accessStatus,
    reload: reloadAccess,
    switchUser,
  } = useDemoAccess();
  const accessState = useSyncExternalStore(
    access.subscribe,
    access.getState,
    access.getState,
  );
  const role = accessState.roles[0] ?? "guest";
  const toggleRole = () =>
    access.setState({ roles: [access.hasRole("admin") ? "guest" : "admin"] });
  const [settings, setSettings] = useState(defaultStudioSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // Top-level route declaration for known pages
  useAutoRoute({
    children: [
      ...pages.flatMap(([id]) => {
        const first = examplesFor(id)[0];
        return first ? [{ id, defaultChild: first.id }] : [];
      }),
      { id: "tree-demo", defaultChild: "details" },
    ],
    defaultChild: "table",
  });

  const page = nav.path[0] || "table";
  const examples = examplesFor(page);
  const example = nav.path[1] || examples[0]?.id || "local";
  const serverExample = example === "server";
  const permissions: PermissionsControls = {
    status: accessStatus,
    reload: reloadAccess,
    switchUser,
    role,
    onToggleRole: toggleRole,
  };

  const fillHeight = true;

  // Light/dark are the built-in default theme; presets layer a popular
  // open-source look on top by overriding the --auto-* tokens.
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const dark =
    settings.theme === "dark" || (settings.theme === "auto" && systemDark);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("studio-dark", dark);
    const isBase = ["auto", "light", "dark"].includes(settings.theme);
    if (settings.theme === "auto") root.removeAttribute("data-auto-theme");
    else
      root.setAttribute("data-auto-theme", isBase ? settings.theme : "light");
    if (isBase) root.removeAttribute("data-auto-preset");
    else root.setAttribute("data-auto-preset", settings.theme);
  }, [dark, settings.theme]);

  return (
    <AutoConfigProvider
      config={{
        namespace: "auto-studio",
        t: translate,
        access,
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
          className={`studio ${dark ? "studio-dark" : ""} ${fillHeight ? "studio-fill" : ""}`}
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
                    children: examplesFor(id).map((child) => ({
                      id: `${id}/${child.id}`,
                      label: tr(child.label),
                      target: `${id}:${child.id}`,
                    })),
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
              <span className="breadcrumb">
                {pages.find((p) => p[0] === page)?.[2] ?? page}
              </span>
              <div className="auto-actions">
                <LanguagePicker />
                <button
                  onClick={() => setSettingsOpen(true)}
                  aria-label={tr("Open Global Settings")}
                >
                  <SettingsIcon />
                </button>
              </div>
            </header>
            <main
              data-page={page}
              data-example={serverExample ? "server" : "component"}
            >
              <div className="page-heading">
                <h1>{tr(pages.find((p) => p[0] === page)?.[3] ?? page)}</h1>
                <div className="auto-actions">
                  <button
                    type="button"
                    className="code-button"
                    data-testid="open-nav-debug"
                    onClick={() => setNavOpen(true)}
                  >
                    {treeIcon}
                    {tr("Debug nav")}
                  </button>
                  <button
                    type="button"
                    className="code-button"
                    onClick={() => setCodeOpen(true)}
                  >
                    <span aria-hidden="true">{"</>"}</span>
                    {tr("View code")}
                  </button>
                </div>
              </div>

              {examples.length > 0 && (
                <div className="demo-navigation">
                  <AutoTabs
                    route={{ name: page, defaultChild: examples[0].id }}
                    keepMounted={false}
                    items={examples.map((child) => ({
                      id: child.id,
                      label: tr(child.label),
                      tip: child.tip ? tr(child.tip) : undefined,
                    }))}
                  />
                </div>
              )}
              <div className="demo-viewport">
                <PageExample
                  page={page}
                  example={example}
                  role={role}
                  onToggleRole={toggleRole}
                  permissions={permissions}
                />
              </div>
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
        <AutoDialog
          open={navOpen}
          onOpenChange={setNavOpen}
          title={tr("Navigation Tree")}
          width={560}
          hideFooter
          content={
            <div
              className="demo-navigation-bar"
              data-testid="demo-navigation-bar"
            >
              <span className="version-pill" data-testid="nav-path-badge">
                path: <strong>{nav.path.join(":") || "/"}</strong>
              </span>
              {Object.keys(nav.params).length > 0 && (
                <span className="version-pill" data-testid="nav-params-badge">
                  params: <strong>{JSON.stringify(nav.params)}</strong>
                </span>
              )}
              <div className="demo-navigation-actions">
                <button
                  type="button"
                  className="code-button"
                  data-testid="nav-goto-large"
                  onClick={() => nav.goto("table:large")}
                >
                  {tr("Global:")} table:large
                </button>
                <button
                  type="button"
                  className="code-button"
                  data-testid="nav-goto-chat-perf"
                  onClick={() => nav.goto("chat:performance")}
                >
                  {tr("Global:")} chat:performance
                </button>
                <button
                  type="button"
                  className="code-button"
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
                  data-testid="nav-relative-server"
                  onClick={() => nav.goto("./server", { basePath: [page] })}
                >
                  {tr("Relative:")} ./server
                </button>
                <button
                  type="button"
                  className="code-button"
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
                  data-testid="nav-toggle-role"
                  onClick={toggleRole}
                >
                  {tr("Role")}: <strong>{role}</strong>
                </button>
              </div>
            </div>
          }
        />
        <CodeViewer
          open={codeOpen}
          serverDriven={serverExample}
          permissions={example === "permissions"}
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
