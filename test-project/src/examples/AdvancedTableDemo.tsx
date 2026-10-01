import { useMemo } from "react";
import { AutoTable } from "@zeroman/react-auto-components";
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
