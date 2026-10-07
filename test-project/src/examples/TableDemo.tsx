import { useMemo, useState } from "react";
import { AutoTable } from "@zeroman.yang/react-auto-components";
import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx";
import { useDemoText } from "../i18n";
import { useDemoData, makeProjects, makeMassiveProjects, createSource, type Project } from "../data";
import { AutoHeightDemo } from "./AutoHeightDemo";
import { TreeTableDemo } from "./TreeTableDemo";
import { ExpandedRowsDemo } from "./ExpandedRowsDemo";
import "./mock/mock.css";

export function TableDemo({ mode }: { mode: string }) {
  const tr = useDemoText();
  const { columns, fields, searchFields, complexSearchFields } = useDemoData();
  const [rows, setRows] = useState(() => makeProjects(48));
  const [sentQuery, setSentQuery] = useState("");
  const [layoutMode, setLayoutMode] = useState<"compact" | "classic" | "card">("classic");
  const [showStatusPills, setShowStatusPills] = useState(true);
  const [isHighDensitySearch, setIsHighDensitySearch] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const big = useMemo(() => makeMassiveProjects(100000), []);

  const displayRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        name: tr(row.name),
      })),
    [rows, tr],
  );

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return displayRows;
    return displayRows.filter((r) => r.status === statusFilter);
  }, [displayRows, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: displayRows.length,
      "In Progress": 0,
      Completed: 0,
      "Pending Start": 0,
    };
    for (const r of displayRows) {
      if (r.status in counts) {
        counts[r.status]++;
      }
    }
    return counts;
  }, [displayRows]);

  const displayBig = useMemo(
    () =>
      big.map((row) => ({
        ...row,
        name: tr(row.name),
      })),
    [big, tr],
  );

  const source = useMemo(() => {
    const load = createSource(displayRows);
    return async (
      query: Parameters<typeof load>[0],
      context: Parameters<typeof load>[1],
    ) => {
      setSentQuery(JSON.stringify(query, null, 2));
      return load(query, context);
    };
  }, [displayRows]);

  const filterPills = (
    <div
      className="filter-pills"
      role="radiogroup"
      aria-label={tr("Filter by project status")}
    >
      {(["all", "In Progress", "Completed", "Pending Start"] as const).map(
        (key) => {
          const active = statusFilter === key;
          const count = statusCounts[key] ?? 0;
          const label = key === "all" ? tr("All") : tr(key);
          return (
            <button
              key={key}
              type="button"
              className="filter-pill"
              data-active={active ? "true" : "false"}
              aria-pressed={active}
              onClick={() => setStatusFilter(key)}
            >
              <span>{label}</span>
              <span className="pill-count">{count}</span>
            </button>
          );
        },
      )}
    </div>
  );

  const showcaseBar =
    mode === "local" ? (
      <div className="table-showcase-bar">
        <div className="table-showcase-group">
          <span className="table-showcase-label">{tr("Toolbar layout")}</span>
          <div
            className="table-mode-switch"
            role="radiogroup"
            aria-label={tr("Toolbar layout")}
          >
            <button
              type="button"
              data-active={layoutMode === "classic" ? "true" : "false"}
              onClick={() => setLayoutMode("classic")}
            >
              {tr("Classic Panel")}
            </button>
            <button
              type="button"
              data-active={layoutMode === "compact" ? "true" : "false"}
              onClick={() => setLayoutMode("compact")}
            >
              {tr("Compact Inline")}
            </button>
            <button
              type="button"
              data-active={layoutMode === "card" ? "true" : "false"}
              onClick={() => setLayoutMode("card")}
            >
              {tr("Card Decoupled")}
            </button>
          </div>
        </div>
        <div className="table-showcase-group">
          <label className="table-showcase-toggle">
            <input
              type="checkbox"
              checked={isHighDensitySearch}
              onChange={(e) => setIsHighDensitySearch(e.target.checked)}
            />
            <span>{tr("High-density search")}</span>
          </label>
        </div>
        {layoutMode === "compact" && (
          <div className="table-showcase-group">
            <label className="table-showcase-toggle">
              <input
                type="checkbox"
                checked={showStatusPills}
                onChange={(e) => {
                  setShowStatusPills(e.target.checked);
                  if (!e.target.checked) setStatusFilter("all");
                }}
              />
              <span>{tr("Status pills")}</span>
            </label>
          </div>
        )}
      </div>
    ) : null;

  const isInline = mode === "local" && layoutMode !== "classic";

  const tableTitle =
    mode === "local" && layoutMode !== "classic"
      ? undefined
      : tr("All Projects");

  const classicExtra = (
    <div
      className="table-header-meta"
      style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
    >
      <span className="decoupled-card-badge">
        {filteredRows.length}
      </span>
      {filterPills}
    </div>
  );

  const headerExtraContent =
    mode === "remote" ? undefined : mode === "local" && layoutMode === "classic"
      ? classicExtra
      : showStatusPills
        ? filterPills
        : undefined;

  const tableNode = (
    <AutoTable<Project>
      key={`${mode}-${layoutMode}-${isHighDensitySearch}`}
      id={`projects-${mode}`}
      title={tableTitle}
      {...(mode === "remote"
        ? {
            dataSource: source,
          }
        : {
            data: mode === "large" ? displayBig : filteredRows,
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
      searchFields={isHighDensitySearch ? complexSearchFields : searchFields}
      searchInline={isInline}
      searchLayout={{ labelPosition: "left" }}
      formFields={fields}
      pageSize={10}
      pagination={mode !== "large"}
      height="auto"
      onAdd={
        mode === "local" && layoutMode === "card"
          ? undefined
          : async (value) => {
              setRows((r) => [
                {
                  ...value,
                  id: crypto.randomUUID(),
                },
                ...r,
              ]);
            }
      }
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
          label: tr("Copy project name"),
          icon: (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          ),
          onClick: (row) => navigator.clipboard.writeText(row.name),
        },
        {
          id: "delete",
          label: tr("Delete"),
          icon: (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          ),
          danger: true,
          separator: true,
          onClick: (row) => setRows((r) => r.filter((x) => x.id !== row.id)),
        },
      ]}
      headerExtra={headerExtraContent}
      actions={
        mode === "local" && layoutMode === "card" ? undefined : (
          <button type="button" onClick={() => alert(tr("Import sample data"))}>
            {tr("Import")}
          </button>
        )
      }
      batchActions={(selected) => (
        <button
          type="button"
          onClick={() =>
            alert(tr("Archived {0} projects", [selected.length]))
          }
        >
          {tr("Archive selected")} ({selected.length})
        </button>
      )}
      exportXlsx={exportXlsx}
    />
  );

  const content =
    mode === "auto-height" ? (
      <AutoHeightDemo />
    ) : mode === "tree" ? (
      <TreeTableDemo />
    ) : mode === "expanded" ? (
      <ExpandedRowsDemo />
    ) : mode === "local" && layoutMode === "card" ? (
      <div className="decoupled-card-container">
        <div className="decoupled-card-header">
          <div className="decoupled-card-left">
            <h3>{tr("Projects Dashboard")}</h3>
            <span className="decoupled-card-badge">
              {filteredRows.length}
            </span>
            {filterPills}
          </div>
          <div className="decoupled-card-right">
            <button
              type="button"
              onClick={() => alert(tr("Import sample data"))}
            >
              {tr("Import")}
            </button>
            <button
              type="button"
              className="auto-primary"
              onClick={() => alert(tr("Trigger create flow"))}
            >
              {tr("New Project")}
            </button>
          </div>
        </div>
        <div className="decoupled-card-banner">
          <span className="banner-icon">💡</span>
          <span>
            {tr(
              "Outer card header owns title and actions; table stays pure with inline query and view tools.",
            )}
          </span>
        </div>
        {tableNode}
      </div>
    ) : (
      tableNode
    );

  return (
    <section className="table-demo">
      {showcaseBar}
      {content}
      {mode === "remote" && (
        <details className="mock-response" data-testid="table-query-exchange">
          <summary>{tr("mock.table.exchange")}</summary>
          <pre>{sentQuery}</pre>
        </details>
      )}
      {mode !== "auto-height" && mode !== "remote" && (
        <div className="hint">
          <span>✦</span>
          {tr(
            'Hold Shift and click column headers to sort by multiple columns. Double-click a project name to copy it, and save your own layout in "Settings".',
          )}
        </div>
      )}
    </section>
  );
}
