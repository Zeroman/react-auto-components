import { useMediaQuery } from "./useMediaQuery";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useDemoText, useDemoLanguage, LanguagePicker } from "./i18n";
import { GlobalSettings, defaultStudioSettings } from "./GlobalSettings";
import {
  AutoConfigProvider,
  AutoDialogProvider,
  AutoDialog,
  AutoMenu,
} from "@zeroman/react-auto-components";
import { TableDemo } from "./examples/TableDemo";
import { FormDemo } from "./examples/FormDemo";
import { SearchDemo } from "./examples/SearchDemo";
import { DialogDemo } from "./examples/DialogDemo";
import { TabsDemo } from "./examples/TabsDemo";
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

const pages: ReadonlyArray<readonly [string, ReactNode, string, string]> = [
  ["table", tableIcon, "AutoTable", "智能表格"],
  ["form", formIcon, "AutoForm", "动态表单"],
  ["search", searchIcon, "AutoSearchPanel", "搜索面板"],
  ["dialog", dialogIcon, "AutoDialog", "对话框"],
  ["tabs", tabsIcon, "AutoTabs", "标签导航"],
  ["chat", chatIcon, "AutoChat", "chat.title"],
];
export function App() {
  const tr = useDemoText();
  const { translate } = useDemoLanguage();
  const narrowMenu = useMediaQuery("(max-width: 700px)");
  const [page, setPage] = useState<string>("table");
  const [settings, setSettings] = useState(defaultStudioSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [tableMode, setTableMode] = useState(() =>
    new URLSearchParams(window.location.search).get("demo") === "auto-height"
      ? "auto-height"
      : "local",
  );
  const fillHeight = true;

  useEffect(() => {
    document.documentElement.classList.toggle("studio-dark", settings.dark);
  }, [settings.dark]);

  return (
    <AutoConfigProvider
      config={{
        namespace: "auto-studio",
        t: translate,
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
              label={tr("组件工作区")}
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
                  <small>{tr("独立组件测试项目 / v0.1.0")}</small>
                </div>
              }
              items={[
                ...pages.map(([id, icon, name, label]) => ({
                  id,
                  label: name,
                  icon,
                  description: tr(label),
                })),
                {
                  id: "settings",
                  label: tr("全局设置"),
                  icon: <SettingsIcon />,
                  description: tr("布局与外观"),
                },
              ]}
              value={page}
              onChange={(id) => {
                if (id === "settings") setSettingsOpen(true);
                else setPage(id);
              }}
            />
          </aside>
          <div className="studio-main">
            <header className="topbar">
              <span>
                {tr("组件实验室")}{" "}
                <span className="breadcrumb">
                  / {pages.find((p) => p[0] === page)?.[2]}
                </span>
              </span>
              <div className="auto-actions">
                <LanguagePicker />
                <span className="version-pill" title={tr("全局组件尺寸")}>
                  {tr("尺寸:  {0}", [
                    settings.size === "small"
                      ? tr("小 (S)")
                      : settings.size === "large"
                        ? tr("大 (L)")
                        : tr("中 (M)"),
                  ])}
                </span>
                <span className="version-pill" title={tr("全局表格紧凑度")}>
                  {tr("表格:  {0}", [
                    settings.tableDensity === "compact"
                      ? tr("紧凑")
                      : settings.tableDensity === "comfortable"
                        ? tr("舒适")
                        : tr("标准"),
                  ])}
                </span>
                <span className="version-pill" title={tr("全局标签紧凑度")}>
                  {tr("标签: {0}", [
                    settings.tabsDensity === "compact"
                      ? tr("紧凑")
                      : tr("舒适"),
                  ])}
                </span>
                <button
                  onClick={() => setSettingsOpen(true)}
                  aria-label={tr("打开全局设置")}
                >
                  <SettingsIcon />
                </button>
                <span className="avatar">AS</span>
              </div>
            </header>
            <main data-page={page}>
              <div className="page-heading">
                <h1>{tr(pages.find((p) => p[0] === page)?.[3] ?? "")}</h1>
                <button
                  type="button"
                  className="code-button"
                  onClick={() => setCodeOpen(true)}
                >
                  <span aria-hidden="true">{"</>"}</span>
                  {tr("查看代码")}
                </button>
              </div>
              <div className="demo-viewport">
                {page === "table" ? (
                  <TableDemo mode={tableMode} onModeChange={setTableMode} />
                ) : page === "form" ? (
                  <FormDemo />
                ) : page === "search" ? (
                  <SearchDemo />
                ) : page === "dialog" ? (
                  <DialogDemo />
                ) : page === "chat" ? (
                  <Suspense
                    fallback={<div role="status">{tr("chat.loading")}</div>}
                  >
                    <ChatDemo />
                  </Suspense>
                ) : (
                  <TabsDemo />
                )}
              </div>
              <footer className="page-footer">
                <span>Auto Studio — Build with clarity.</span>
                <span>{tr("通过 npm 打包产物测试 · 无源码路径别名")}</span>
              </footer>
            </main>
          </div>
        </div>
        <AutoDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          title={tr("全局设置")}
          width={500}
          hideFooter
          content={<GlobalSettings value={settings} onChange={setSettings} />}
        />
        <CodeViewer
          open={codeOpen}
          onOpenChange={setCodeOpen}
          page={page}
          title={tr(pages.find((p) => p[0] === page)?.[3] ?? "")}
        />
      </AutoDialogProvider>
    </AutoConfigProvider>
  );
}
