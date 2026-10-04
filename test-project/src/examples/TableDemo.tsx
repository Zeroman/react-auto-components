import { useMemo, useState } from "react";
import { AutoTable } from "@zeroman.yang/react-auto-components";
import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx";
import { useDemoText } from "../i18n";
import { useDemoData, makeProjects, createSource, type Project } from "../data";
import { AutoHeightDemo } from "./AutoHeightDemo";
import { AdvancedTableDemo } from "./AdvancedTableDemo";
import "./mock/mock.css";

export function TableDemo({ mode }: { mode: string }) {
  const tr = useDemoText();
  const { columns, fields, searchFields } = useDemoData();
  const [rows, setRows] = useState(() => makeProjects(48));
  const [sentQuery, setSentQuery] = useState("");
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
