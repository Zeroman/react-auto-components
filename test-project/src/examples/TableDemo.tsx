import { useMemo, useState } from "react";
import { AutoTable, AutoTabs } from "@zeroman.yang/react-auto-components";
import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx";
import { useDemoText } from "../i18n";
import { useDemoData, makeProjects, createSource, type Project } from "../data";
import { AutoHeightDemo } from "./AutoHeightDemo";
import { AdvancedTableDemo } from "./AdvancedTableDemo";

export function TableDemo({
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
        title={tr("All Projects")}
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
            label: tr("Copy project name"),
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
            {tr(
              "✦ Double-click a cell to copy · Shift for multi-column sort · Drag to resize columns",
            )}
          </span>
        }
        exportXlsx={exportXlsx}
      />
    );
  return (
    <section className="table-demo">
      <div className="section-heading">
        <div>
          <h2>{tr("Project Workbench")}</h2>
          <p>
            {tr(
              "Search, sort, layout, export, and edit — all in one workflow.",
            )}
          </p>
        </div>
      </div>
      <AutoTabs
        value={[mode]}
        onChange={(path) => onModeChange(path[0])}
        keepMounted={false}
        items={[
          ["local", tr("Local Data")],
          ["remote", tr("Server-side")],
          ["large", tr("10,000 rows of data")],
          ["advanced", tr("Tree & Expansion")],
          ["auto-height", tr("Remaining Height")],
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
            'Hold Shift and click column headers to sort by multiple columns. Double-click a project name to copy it, and save your own layout in "Settings".',
          )}
        </div>
      )}
    </section>
  );
}
