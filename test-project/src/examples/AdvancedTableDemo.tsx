import { useMemo } from "react";
import { AutoTable } from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";
import { makeProjects, type Project } from "../data";

export function AdvancedTableDemo() {
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
      title={tr("Tree and dynamic expansion")}
      data={rows}
      rowKey="id"
      columns={[
        {
          key: "name",
          label: tr("Name"),
          format: (value, row) =>
            row.id.endsWith("-child")
              ? tr("{0} · Subtasks", [String(value)])
              : tr(String(value)),
          width: 280,
        },
        {
          key: "owner",
          label: tr("Owner"),
          format: (value) => tr(String(value)),
        },
        {
          key: "budget",
          label: tr("Budget"),
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
          <h3>{tr("{0} · Details", [row.name])}</h3>
          <p>
            {tr(
              "Expanded areas participate in virtual height measurement. As you keep scrolling, subsequent rows stay correctly positioned.",
            )}
          </p>
        </div>
      )}
      pagination={false}
      height="auto"
    />
  );
}
