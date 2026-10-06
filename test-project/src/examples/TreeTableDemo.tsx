import { useMemo } from "react";
import { AutoTable } from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";
import { makeProjects, type Project } from "../data";

export function TreeTableDemo() {
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
      id="tree-projects"
      title={tr("Tree Table")}
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
      pagination={false}
      height="auto"
    />
  );
}
