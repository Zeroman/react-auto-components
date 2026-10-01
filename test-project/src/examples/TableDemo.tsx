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
