import { useMediaQuery } from "./useMediaQuery";
import { useEffect, useState } from "react";
import { useDemoText, useDemoLanguage, LanguagePicker } from "./i18n";
import { GlobalSettings, defaultStudioSettings } from "./GlobalSettings";
import {
  AutoConfigProvider,
  AutoDialogProvider,
  AutoDialog,
  AutoPopoverProvider,
  AutoMenu,
} from "@zeroman/react-auto-components";
import { TableDemo } from "./examples/TableDemo";
import { FormDemo } from "./examples/FormDemo";
import { SearchDemo } from "./examples/SearchDemo";
import { DialogDemo } from "./examples/DialogDemo";
import { PopoverDemo } from "./examples/PopoverDemo";
import { ScrollDemo } from "./examples/ScrollDemo";
import { TabsDemo } from "./examples/TabsDemo";
import { CodeViewer } from "./CodeViewer";

const pages = [
  ["table", "▤", "AutoTable", "智能表格"],
  ["form", "▧", "AutoForm", "动态表单"],
  ["search", "⌕", "AutoSearchPanel", "搜索面板"],
  ["dialog", "▣", "AutoDialog", "对话框"],
  ["popover", "◈", "AutoPopover", "浮层"],
  ["scroll", "↕", "AutoScroll", "虚拟滚动"],
  ["tabs", "⊞", "AutoTabs", "标签导航"],
] as const;
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
        <AutoPopoverProvider>
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
                    icon: "⚙",
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
                    ⚙
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
                  ) : page === "popover" ? (
                    <PopoverDemo />
                  ) : page === "scroll" ? (
                    <ScrollDemo />
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
        </AutoPopoverProvider>
      </AutoDialogProvider>
    </AutoConfigProvider>
  );
}
