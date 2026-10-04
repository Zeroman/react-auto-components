import { useDemoText } from "../i18n";
import { useMemo, useRef, useState } from "react";
import {
  AutoTable,
  type AutoTableHandle,
} from "@zeroman.yang/react-auto-components";
import { useDemoData, makeProjects, type Project } from "../data";
export function AutoHeightDemo() {
  const tr = useDemoText();
  const { columns, searchFields } = useDemoData();
  const rows = useMemo(() => makeProjects(10000), []);
  const table = useRef<AutoTableHandle<Project>>(null);
  const [layout, setLayout] = useState("flex");
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pagination, setPagination] = useState(true);
  const [count, setCount] = useState("all");
  return (
    <div
      className={`height-demo auto-root ${hidden ? "height-demo-hidden" : ""}`}
      data-testid="height-frame"
      data-layout={layout}
    >
      <header className="height-demo-header">
        <div className="auto-actions">
          <label>
            {tr("Parent layout")}{" "}
            <select
              aria-label={tr("Parent layout")}
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
            >
              <option value="flex">Flex</option>
              <option value="grid">Grid</option>
            </select>
          </label>
          <button onClick={() => setExpanded((v) => !v)}>
            {tr("Toggle description above")}
          </button>
          <button onClick={() => setHidden((v) => !v)}>
            {hidden ? tr("Show table") : tr("Hide table")}
          </button>
          <label>
            <input
              type="checkbox"
              checked={pagination}
              onChange={(e) => setPagination(e.target.checked)}
            />
            {tr("Show pagination")}
          </label>
          <label>
            {tr("Data size")}{" "}
            <select
              aria-label={tr("Data size")}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            >
              <option value="all">{tr("10000 rows")}</option>
              <option value="few">{tr("3 rows")}</option>
              <option value="empty">{tr("Empty data")}</option>
            </select>
          </label>
          <button
            disabled={pagination || count !== "all"}
            onClick={() => table.current?.scrollToRow("9000")}
          >
            {tr("Scroll to row 9000")}
          </button>
        </div>
        {expanded && (
          <p className="height-demo-explanation">
            {tr(
              "This description occupies normal layout space. After resizing the window, expanding search filters, or toggling pagination, the table data area automatically fills the remaining height.",
            )}
          </p>
        )}
      </header>
      <AutoTable<Project>
        ref={table}
        id="remaining-height"
        title={tr("Adaptive table")}
        rowKey="id"
        data={count === "all" ? rows : count === "few" ? rows.slice(0, 3) : []}
        columns={columns}
        searchFields={[
          ...searchFields,
          {
            name: "owner",
            label: tr("Owner"),
            search: { more: true },
          },
        ]}
        pageSize={100}
        pagination={pagination}
        height="auto"
      />
      <footer className="height-demo-footer">
        {tr(
          "The footer always stays at the bottom of the container, and data scrolls inside the table.",
        )}
      </footer>
    </div>
  );
}
