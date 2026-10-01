import { useMediaQuery } from "./useMediaQuery";
import { useViewportHeight } from "./useViewportHeight";
import { useDemoText, useDemoLanguage, LanguagePicker } from "./i18n";
import { GlobalSettings, defaultStudioSettings } from "./GlobalSettings";
import { AutoHeightDemo } from "./AutoHeightDemo";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AutoConfigProvider,
  AutoDialogProvider,
  AutoDialog,
  AutoPopoverProvider,
  AutoTable,
  AutoForm,
  AutoSearchPanel,
  AutoScroll,
  AutoTabs,
  AutoMenu,
  AutoPopover,
  useAutoConfig,
  useAutoDialog,
  useAutoPopover,
  serializeRsql,
  matchesQuery,
  type AutoScrollHandle,
  type AutoFormHandle,
  type Field,
  type QueryNode,
} from "@zeroman/react-auto-components";
import { exportXlsx } from "@zeroman/react-auto-components/xlsx";
import {
  useDemoData,
  makeProjects,
  createSource,
  type Project,
  type GalleryRecord,
} from "./data";
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
        </AutoPopoverProvider>
      </AutoDialogProvider>
    </AutoConfigProvider>
  );
}
function Metric({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: string;
  unit: string;
  detail: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
      <p>{detail}</p>
    </div>
  );
}
function TableDemo({
  mode,
  onModeChange,
}: {
  mode: string;
  onModeChange: (mode: string) => void;
}) {
  const tr = useDemoText();
  const { columns, fields, searchFields } = useDemoData();
  const [rows, setRows] = useState(() => makeProjects(48));
  const big = useMemo(() => makeProjects(10000), []);
  const displayRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        name: tr(row.name),
      })),
    [rows, tr],
  );
  const displayBig = useMemo(
    () =>
      big.map((row) => ({
        ...row,
        name: tr(row.name),
      })),
    [big, tr],
  );
  const source = useMemo(() => createSource(displayRows), [displayRows]);
  const content =
    mode === "auto-height" ? (
      <AutoHeightDemo />
    ) : mode === "advanced" ? (
      <AdvancedTableDemo />
    ) : (
      <AutoTable<Project>
        key={mode}
        id={`projects-${mode}`}
        title={tr("全部项目")}
        {...(mode === "remote"
          ? {
              dataSource: source,
            }
          : {
              data: mode === "large" ? displayBig : displayRows,
            })}
        rowKey="id"
        columns={columns.map((c) =>
          c.key === "status"
            ? {
                ...c,
                render: (value) => (
                  <span
                    className={`status status-${value === "Completed" ? "done" : value === "In Progress" ? "active" : "pending"}`}
                  >
                    {tr(String(value))}
                  </span>
                ),
              }
            : c,
        )}
        searchFields={searchFields}
        formFields={fields}
        pageSize={10}
        pagination={mode !== "large"}
        height="auto"
        onAdd={async (value) => {
          setRows((r) => [
            {
              ...value,
              id: crypto.randomUUID(),
            },
            ...r,
          ]);
        }}
        onEdit={async (row, value) =>
          setRows((r) =>
            r.map((x) =>
              x.id === row.id
                ? {
                    ...value,
                    name: value.name === tr(x.name) ? x.name : value.name,
                    id: row.id,
                  }
                : x,
            ),
          )
        }
        onDelete={async (deleted) =>
          setRows((r) => r.filter((x) => !deleted.some((d) => d.id === x.id)))
        }
        rowActions={[
          {
            id: "copy",
            label: tr("复制项目名称"),
            onClick: (row) => navigator.clipboard.writeText(row.name),
          },
        ]}
        toolbar={
          <span
            className="auto-muted"
            style={{
              fontSize: 12,
            }}
          >
            {tr("✦ 双击单元格复制 · Shift 多列排序 · 拖拽调整列宽")}
          </span>
        }
        exportXlsx={exportXlsx}
      />
    );
  return (
    <section className="table-demo">
      <div className="section-heading">
        <div>
          <h2>{tr("项目工作台")}</h2>
          <p>{tr("搜索、排序、布局、导出与编辑，保持在同一工作流中。")}</p>
        </div>
      </div>
      <AutoTabs
        value={[mode]}
        onChange={(path) => onModeChange(path[0])}
        keepMounted={false}
        items={[
          ["local", tr("本地数据")],
          ["remote", tr("服务端")],
          ["large", tr("万行数据")],
          ["advanced", tr("树形与展开")],
          ["auto-height", tr("剩余高度")],
        ].map(([id, label]) => ({
          id,
          label,
          content: id === mode ? content : null,
        }))}
      />
      {mode !== "auto-height" && (
        <div className="hint">
          <span>✦</span>
          {tr(
            "按住 Shift 点击列标题可多列排序。双击项目名称复制内容，在「设置」中保存专属布局。",
          )}
        </div>
      )}
    </section>
  );
}
function FormDemo() {
  const tr = useDemoText();
  const { fields, galleryFields } = useDemoData();
  const services = useAutoConfig();
  const formRef = useRef<AutoFormHandle<Project>>(null);
  const [labelPosition, setLabelPosition] = useState<
    "inherit" | "top" | "left"
  >("inherit");
  const [labelAlign, setLabelAlign] = useState<"inherit" | "left" | "right">(
    "inherit",
  );
  const [labelWidth, setLabelWidth] = useState<
    "inherit" | "auto" | "80" | "120"
  >("inherit");
  const [compact, setCompact] = useState<boolean | undefined>(undefined);
  const [result, setResult] = useState(""),
    [fail, setFail] = useState(false);
  const extra: Field<Project>[] = [
    ...fields,
    {
      name: "id",
      label: tr("内部编号"),
      hidden: (v) => !v.active,
      placeholder: tr("启用时显示"),
    },
  ];
  return (
    <div
      style={{
        display: "grid",
        gap: 24,
      }}
    >
      <div className="demo-grid">
        <section className="card">
          <h2>{tr("创建一个项目")}</h2>
          <p className="muted">{tr("必填校验、字段联动和异步提交。")}</p>
          <div className="auto-root">
            <label>
              <input
                type="checkbox"
                checked={fail}
                onChange={(e) => setFail(e.target.checked)}
              />
              {tr("模拟提交失败")}
            </label>
          </div>
          <div
            className="auto-root auto-actions"
            style={{
              margin: "12px 0",
            }}
          >
            <label>
              {tr("标签位置")}{" "}
              <select
                aria-label={tr("表单标签位置")}
                value={labelPosition}
                onChange={(e) =>
                  setLabelPosition(e.target.value as "inherit" | "top" | "left")
                }
              >
                <option value="inherit">{tr("跟随全局")}</option>
                <option value="top">{tr("上方")}</option>
                <option value="left">{tr("左侧")}</option>
              </select>
            </label>
            <label>
              {tr("标签文字对齐")}{" "}
              <select
                aria-label={tr("表单标签对齐")}
                value={labelAlign}
                onChange={(e) =>
                  setLabelAlign(e.target.value as "inherit" | "left" | "right")
                }
              >
                <option value="inherit">{tr("跟随全局")}</option>
                <option value="left">{tr("左对齐")}</option>
                <option value="right">{tr("右对齐")}</option>
              </select>
            </label>
            <label>
              {tr("标签宽度")}{" "}
              <select
                aria-label={tr("表单标签宽度")}
                value={labelWidth}
                onChange={(e) =>
                  setLabelWidth(
                    e.target.value as "inherit" | "auto" | "80" | "120",
                  )
                }
              >
                <option value="inherit">{tr("跟随全局")}</option>
                <option value="auto">{tr("自适应 (auto)")}</option>
                <option value="80">{tr("固定 80px")}</option>
                <option value="120">{tr("固定 120px")}</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={compact ?? services.form.density === "compact"}
                onChange={(e) => setCompact(e.target.checked)}
              />
              {tr("紧凑表单")}
            </label>
          </div>
          <AutoForm<Project>
            ref={formRef}
            labelAlign={labelAlign === "inherit" ? undefined : labelAlign}
            labelPosition={
              labelPosition === "inherit" ? undefined : labelPosition
            }
            labelWidth={
              labelWidth === "inherit"
                ? undefined
                : labelWidth === "auto"
                  ? "auto"
                  : Number(labelWidth)
            }
            density={
              compact === undefined
                ? undefined
                : compact
                  ? "compact"
                  : "comfortable"
            }
            fields={extra}
            extraActions={
              <button
                type="button"
                onClick={() =>
                  formRef.current?.reset({
                    id: "999",
                    name: "Intelligent R&D Cloud Platform",
                    owner: "Chen Ruolin",
                    status: "In Progress",
                    budget: 48000,
                    progress: 72,
                    region: "Shanghai",
                    date: "2026-10-25",
                    active: true,
                  })
                }
              >
                {tr("填入测试数据")}
              </button>
            }
            onSubmit={async (value) => {
              if (fail)
                throw new Error(tr("模拟服务端拒绝，请关闭失败开关后重试"));
              setResult(JSON.stringify(value, null, 2));
            }}
          />
        </section>
        <section className="card code-card">
          <div className="code-title">
            {tr("提交结果")}
            <span>JSON</span>
          </div>
          <pre data-testid="form-result">
            {result || tr("// 填写表单并提交\n// 数据将显示在这里")}
          </pre>
          <div className="code-note">
            {tr("字段类型通过数据模型约束，扩展字段通过 render 注入。")}
          </div>
        </section>
      </div>

      <section className="card auto-root">
        <div className="section-heading">
          <div>
            <h2>{tr("全组件类型画廊")}</h2>
            <p className="muted">
              {tr(
                "多级级联、自动补全、虚拟滚动大列表、日期范围及快捷键等丰富字段一览。",
              )}
            </p>
          </div>
        </div>
        <AutoForm<GalleryRecord>
          columns={2}
          labelPosition={
            labelPosition === "inherit" ? undefined : labelPosition
          }
          density={
            compact === undefined
              ? undefined
              : compact
                ? "compact"
                : "comfortable"
          }
          fields={galleryFields}
          submitLabel={tr("提交画廊数据")}
          onSubmit={async (value) => {
            setResult(JSON.stringify(value, null, 2));
          }}
        />
      </section>
    </div>
  );
}
function SearchDemo() {
  const tr = useDemoText();
  const { searchFields } = useDemoData();
  const [result, setResult] = useState(""),
    [instant, setInstant] = useState(false);
  const [queryNode, setQueryNode] = useState<QueryNode | null>(null);
  const sampleProjects = useMemo(
    () =>
      makeProjects(24).map((row) => ({
        ...row,
        name: tr(row.name),
      })),
    [tr],
  );
  const matched = useMemo(() => {
    if (!queryNode) return sampleProjects;
    return sampleProjects.filter((r) => matchesQuery(r, queryNode));
  }, [sampleProjects, queryNode]);
  return (
    <section className="card">
      <h2>{tr("可组合的搜索条件")}</h2>
      <label className="auto-root">
        <input
          type="checkbox"
          checked={instant}
          onChange={(e) => setInstant(e.target.checked)}
        />
        {tr("即时搜索")}
      </label>
      <AutoSearchPanel<Project>
        fields={searchFields}
        mode={instant ? "instant" : "manual"}
        onSearch={(q) => {
          setQueryNode(q);
          setResult(serializeRsql(q));
        }}
      />
      <div className="code-card">
        <pre data-testid="query-result">
          {result || tr("// 搜索后显示 RSQL 查询")}
        </pre>
      </div>

      <div
        style={{
          marginTop: 24,
          borderTop: "1px solid var(--auto-border)",
          paddingTop: 18,
        }}
      >
        <div className="section-heading">
          <div>
            <h3>{tr("实时匹配结果 ({0} 条)", [matched.length])}</h3>
            <p className="muted">
              {tr("根据上方搜索条件实时过滤的示例数据集。")}
            </p>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          {matched.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                padding: 12,
                margin: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>{tr(item.name)}</strong>
                <span className="auto-badge">{tr(item.status)}</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--auto-secondary)",
                  marginTop: 6,
                }}
              >
                {tr("负责人: {0} · 地区: {1} · 预算: ¥ {2}", [
                  tr(item.owner),
                  tr(item.region),
                  item.budget.toLocaleString(),
                ])}
              </div>
            </div>
          ))}
          {matched.length === 0 && (
            <div
              className="auto-empty"
              style={{
                gridColumn: "1 / -1",
                padding: 24,
              }}
            >
              {tr("没有找到符合搜索条件的记录")}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
function DialogDemo() {
  const tr = useDemoText();
  const { fields } = useDemoData();
  const dialog = useAutoDialog();
  const [result, setResult] = useState("");
  return (
    <section className="card auto-root">
      <h2>{tr("让编辑流程保持完整")}</h2>
      <p className="muted">
        {tr("取消会保留草稿；提交成功后清除。支持拖动和全屏。")}
      </p>
      <div className="auto-actions">
        <button
          className="auto-primary"
          onClick={() =>
            dialog.open<Project>({
              title: tr("新建项目"),
              fields,
              defaultValue: {
                name: "",
              },
              draftKey: "demo-project",
              draggable: true,
              showReset: true,
              onSubmit: (value) => setResult(tr("已保存：{0}", [value.name])),
            })
          }
        >
          {tr("打开表单弹窗")}
        </button>
        <button
          onClick={() =>
            dialog.open({
              title: tr("关闭拦截示例"),
              content: <p>{tr("取消操作会被拦截，点击确定即可关闭。")}</p>,
              beforeClose: (reason) => reason === "submit",
            })
          }
        >
          {tr("测试关闭拦截")}
        </button>
        <button
          onClick={() =>
            dialog.open({
              title: tr("第一层"),
              content: (
                <button
                  onClick={() =>
                    dialog.open({
                      title: tr("第二层"),
                      content: <p>{tr("嵌套弹窗会恢复到正确的焦点。")}</p>,
                    })
                  }
                >
                  {tr("打开第二层")}
                </button>
              ),
            })
          }
        >
          {tr("嵌套弹窗")}
        </button>
        <button
          onClick={() =>
            dialog.open({
              title: tr("高危归档操作确认"),
              content: (
                <div>
                  <p
                    style={{
                      color: "var(--auto-danger)",
                      fontWeight: 600,
                      margin: "0 0 8px",
                    }}
                  >
                    {tr("警告：此操作将永久冻结该业务单元全部资源与子任务！")}
                  </p>
                  <p
                    className="auto-muted"
                    style={{
                      margin: 0,
                      fontSize: 13,
                    }}
                  >
                    {tr("系统将保存审计日志。请核对权限后操作。")}
                  </p>
                </div>
              ),
              confirmLabel: tr("确认归档"),
              cancelLabel: tr("放弃"),
              onSubmit: () => setResult(tr("已确认执行高危归档操作")),
            })
          }
        >
          {tr("高危确认弹窗")}
        </button>
        <button
          onClick={() =>
            dialog.open({
              title: tr("全屏数据展示工作区"),
              fullscreen: true,
              content: (
                <div
                  style={{
                    padding: 12,
                  }}
                >
                  <h3>{tr("全屏模式工作区")}</h3>
                  <p className="auto-muted">
                    {tr(
                      "支持复杂业务流、图表分析与多级表格，按 Esc 或右上角关闭返回。",
                    )}
                  </p>
                  <div
                    className="metrics"
                    style={{
                      margin: "20px 0",
                    }}
                  >
                    <Metric
                      label={tr("节点健康度")}
                      value="100"
                      unit="%"
                      detail={tr("全域集群正常")}
                    />
                    <Metric
                      label={tr("并发处理")}
                      value="1,240"
                      unit="qps"
                      detail={tr("平均响应 18ms")}
                    />
                    <Metric
                      label={tr("内存开销")}
                      value="14"
                      unit="MB"
                      detail={tr("TanStack 虚拟化优化")}
                    />
                  </div>
                </div>
              ),
            })
          }
        >
          {tr("全屏模式弹窗")}
        </button>
        <button
          onClick={() => {
            localStorage.removeItem("auto-studio:draft:demo-project");
            setResult(tr("已重置新建项目草稿"));
          }}
        >
          {tr("重置弹窗草稿")}
        </button>
      </div>
      <p role="status">{result}</p>
    </section>
  );
}
function PopoverDemo() {
  const tr = useDemoText();
  const popover = useAutoPopover();
  return (
    <section className="card auto-root">
      <h2>{tr("与内容保持恰当的距离")}</h2>
      <p className="muted">
        {tr("自动避让边界，支持悬浮、点击和命令式打开。")}
      </p>
      <div className="popover-playground">
        {(["top", "right", "bottom", "left"] as const).map((placement) => (
          <AutoPopover
            key={placement}
            placement={placement}
            content={
              <div>
                <strong>{tr("{0} 浮层", [placement])}</strong>
                <p>{tr("这里可以放置任意 React 内容。")}</p>
              </div>
            }
          >
            <button>{placement}</button>
          </AutoPopover>
        ))}
        <AutoPopover trigger="hover" content={tr("移动到内容区仍保持打开")}>
          <button>{tr("悬浮提示")}</button>
        </AutoPopover>
        <button
          onClick={(e) =>
            popover.show({
              anchor: e.currentTarget,
              content: <p>{tr("命令式浮层内容")}</p>,
            })
          }
        >
          {tr("命令式打开")}
        </button>
        <AutoPopover
          placement="bottom"
          content={
            <div
              style={{
                minWidth: 220,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span className="avatar">CY</span>
                <div>
                  <strong>{tr("陈若林")}</strong>
                  <div
                    className="auto-muted"
                    style={{
                      fontSize: 12,
                    }}
                  >
                    {tr("前端工程架构组")}
                  </div>
                </div>
              </div>
              <p
                style={{
                  margin: "4px 0 10px",
                  fontSize: 12,
                  color: "var(--auto-secondary)",
                }}
              >
                {tr("负责 TanStack 虚拟化集成与配置驱动渲染管线。")}
              </p>
              <div className="auto-actions">
                <span className="auto-badge">{tr("研发负责人")}</span>
                <span className="auto-badge">{tr("上海")}</span>
              </div>
            </div>
          }
        >
          <button>{tr("名片浮层")}</button>
        </AutoPopover>
      </div>
    </section>
  );
}
function ScrollDemo() {
  const tr = useDemoText();
  const viewport = useViewportHeight();
  const items = useMemo(() => makeProjects(10000), []);
  const ref = useRef<AutoScrollHandle>(null);
  const [dynamic, setDynamic] = useState(false);
  const [scrollStats, setScrollStats] = useState({
    start: 0,
    end: -1,
    scrollTop: 0,
  });
  return (
    <section className="card auto-root">
      <div className="section-heading">
        <div>
          <h2>{tr("10,000 行，也能轻快浏览")}</h2>
          <p>{tr("只渲染视口附近的数据。")}</p>
        </div>
        <div className="auto-actions">
          <label>
            <input
              type="checkbox"
              checked={dynamic}
              onChange={(e) => setDynamic(e.target.checked)}
            />
            {tr("动态行高")}
          </label>
          <button onClick={() => ref.current?.scrollToIndex(8999)}>
            {tr("跳到第 9000 行")}
          </button>
          <button onClick={() => ref.current?.reset()}>{tr("回到顶部")}</button>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          margin: "10px 0 14px",
          padding: "8px 12px",
          background: "var(--auto-muted)",
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        <span data-testid="scroll-visible-range">
          {tr("当前视口：第")}
          <strong>{scrollStats.start + 1}</strong> -{" "}
          <strong>{Math.min(items.length, scrollStats.end + 1)}</strong>
          {tr("行 / 共 10,000 行")}
        </span>
        <span>
          {tr("滚动偏移：")}
          <strong>{Math.round(scrollStats.scrollTop)}</strong> px
        </span>
        <div className="auto-actions">
          <span className="auto-muted">{tr("快速跳转:")}</span>
          <button type="button" onClick={() => ref.current?.scrollToIndex(0)}>
            {tr("#1 顶部")}
          </button>
          <button
            type="button"
            onClick={() => ref.current?.scrollToIndex(2499)}
          >
            #2500
          </button>
          <button
            type="button"
            onClick={() => ref.current?.scrollToIndex(4999)}
          >
            #5000
          </button>
          <button
            type="button"
            onClick={() => ref.current?.scrollToIndex(7499)}
          >
            #7500
          </button>
          <button
            type="button"
            onClick={() => ref.current?.scrollToIndex(9999)}
          >
            {tr("#10000 底部")}
          </button>
        </div>
      </div>
      <div className="scroll-demo-viewport" ref={viewport.ref}>
        <AutoScroll
          key={String(dynamic)}
          ref={ref}
          items={items}
          getKey={(p) => p.id}
          height={viewport.height}
          rowHeight={52}
          estimatedRowHeight={64}
          mode={dynamic ? "estimated" : "fixed"}
          onScrollChange={setScrollStats}
          renderItem={(p, i) => (
            <div
              className="virtual-project"
              style={{
                minHeight: dynamic && i % 3 === 0 ? 96 : 52,
              }}
              data-testid="virtual-row"
            >
              <span className="row-number">{i + 1}</span>
              <div>
                <strong>{tr(p.name)}</strong>
                {dynamic && i % 3 === 0 && (
                  <p>{tr("这是一行额外说明，用于验证动态高度测量。")}</p>
                )}
              </div>
              <span>{tr(p.owner)}</span>
              <span className="auto-badge">{tr(p.status)}</span>
            </div>
          )}
        />
      </div>
    </section>
  );
}
function TabsDemo() {
  const tr = useDemoText();
  const [mode, setMode] = useState<"horizontal" | "vertical" | "menu">(
    "horizontal",
  );
  const [localSize, setLocalSize] = useState<
    "inherit" | "small" | "medium" | "large"
  >("inherit");
  const [localDensity, setLocalDensity] = useState<
    "inherit" | "compact" | "comfortable"
  >("inherit");
  return (
    <section className="card auto-root">
      <div className="section-heading">
        <div>
          <h2>{tr("导航与内容，自然衔接")}</h2>
          <p
            className="auto-muted"
            style={{
              margin: "4px 0 0",
              fontSize: 13,
            }}
          >
            {tr("支持全局/局部三种尺寸（大中小）与紧凑/舒适度无缝切换。")}
          </p>
        </div>
        <div className="auto-actions">
          <select
            aria-label={tr("标签模式")}
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="horizontal">{tr("横向标签")}</option>
            <option value="vertical">{tr("纵向标签")}</option>
            <option value="menu">{tr("菜单模式")}</option>
          </select>
          <select
            aria-label={tr("局部标签尺寸")}
            value={localSize}
            onChange={(e) => setLocalSize(e.target.value as typeof localSize)}
          >
            <option value="inherit">{tr("尺寸: 继承全局")}</option>
            <option value="small">{tr("尺寸: 小 (S)")}</option>
            <option value="medium">{tr("尺寸: 中 (M)")}</option>
            <option value="large">{tr("尺寸: 大 (L)")}</option>
          </select>
          <select
            aria-label={tr("局部标签紧凑度")}
            value={localDensity}
            onChange={(e) =>
              setLocalDensity(e.target.value as typeof localDensity)
            }
          >
            <option value="inherit">{tr("紧凑度: 继承全局")}</option>
            <option value="compact">{tr("紧凑 (compact)")}</option>
            <option value="comfortable">{tr("舒适 (comfortable)")}</option>
          </select>
        </div>
      </div>
      <AutoTabs
        mode={mode}
        size={localSize === "inherit" ? undefined : localSize}
        density={localDensity === "inherit" ? undefined : localDensity}
        extra={
          <span
            className="auto-badge"
            style={{
              alignSelf: "center",
            }}
          >
            {tr("保持挂载 / 状态持久")}
          </span>
        }
        items={[
          {
            id: "overview",
            label: tr("概览"),
            content: (
              <div className="tab-demo-content">
                <h3>{tr("项目概览")}</h3>
                <p>{tr("切换标签时，已填写的内容会保留。")}</p>
                <input
                  aria-label={tr("标签草稿")}
                  placeholder={tr("在这里输入一些内容…")}
                />
              </div>
            ),
          },
          {
            id: "settings",
            label: tr("配置"),
            children: [
              {
                id: "general",
                label: tr("常规"),
                content: <p>{tr("常规配置内容")}</p>,
              },
              {
                id: "access",
                label: tr("权限"),
                content: <p>{tr("权限配置内容")}</p>,
              },
            ],
          },
          {
            id: "activity",
            label: tr("动态"),
            badge: "NEW",
            content: (
              <div className="tab-demo-content">
                <h3>{tr("活动追踪与审计")}</h3>
                <p className="auto-muted">
                  {tr("展示微前端与复杂面板多标签场景下的动态通知标记。")}
                </p>
                <div
                  className="auto-actions"
                  style={{
                    marginTop: 12,
                  }}
                >
                  <span className="auto-badge">{tr("v0.1.0 稳定构建")}</span>
                  <span className="auto-badge">{tr("100% 独立单测通过")}</span>
                </div>
              </div>
            ),
          },
          {
            id: "disabled",
            label: tr("归档"),
            disabled: true,
          },
        ]}
      />
    </section>
  );
}
function AdvancedTableDemo() {
  const tr = useDemoText();
  type Tree = Project & {
    children?: Tree[];
  };
  const rows = useMemo<Tree[]>(
    () =>
      makeProjects(200).map((p, i) => ({
        ...p,
        children:
          i < 4
            ? [
                {
                  ...p,
                  id: `${p.id}-child`,
                  name: p.name,
                },
              ]
            : undefined,
      })),
    [],
  );
  return (
    <AutoTable<Tree>
      id="advanced-projects"
      title={tr("树形与动态展开")}
      data={rows}
      rowKey="id"
      columns={[
        {
          key: "name",
          label: tr("名称"),
          format: (value, row) =>
            row.id.endsWith("-child")
              ? tr("{0} · 子任务", [String(value)])
              : tr(String(value)),
          width: 280,
        },
        {
          key: "owner",
          label: tr("负责人"),
          format: (value) => tr(String(value)),
        },
        {
          key: "budget",
          label: tr("预算"),
          type: "number",
          align: "right",
          summary: true,
          format: (value) => `¥ ${Number(value).toLocaleString()}`,
        },
      ]}
      getChildren={(row) => row.children}
      renderExpanded={(row) => (
        <div
          data-testid="expanded-detail"
          style={{
            whiteSpace: "normal",
            minHeight: 160,
            padding: 24,
          }}
        >
          <h3>{tr("{0} · 详细信息", [row.name])}</h3>
          <p>
            {tr(
              "展开区域参与虚拟高度测量。继续滚动时，后续行仍保持正确的位置。",
            )}
          </p>
        </div>
      )}
      pagination={false}
      height="auto"
    />
  );
}
