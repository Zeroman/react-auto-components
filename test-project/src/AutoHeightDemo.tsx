import { useDemoText } from "./i18n";
import { useMemo, useRef, useState } from "react";
import {
  AutoTable,
  type AutoTableHandle,
} from "@zeroman/react-auto-components";
import { useDemoData, makeProjects, type Project } from "./data";
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
            {tr("父布局")}{" "}
            <select
              aria-label={tr("父布局")}
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
            >
              <option value="flex">Flex</option>
              <option value="grid">Grid</option>
            </select>
          </label>
          <button onClick={() => setExpanded((v) => !v)}>
            {tr("切换上方说明")}
          </button>
          <button onClick={() => setHidden((v) => !v)}>
            {hidden ? tr("显示表格") : tr("隐藏表格")}
          </button>
          <label>
            <input
              type="checkbox"
              checked={pagination}
              onChange={(e) => setPagination(e.target.checked)}
            />
            {tr("显示分页")}
          </label>
          <label>
            {tr("数据量")}{" "}
            <select
              aria-label={tr("数据量")}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            >
              <option value="all">{tr("10000 行")}</option>
              <option value="few">{tr("3 行")}</option>
              <option value="empty">{tr("空数据")}</option>
            </select>
          </label>
          <button
            disabled={pagination || count !== "all"}
            onClick={() => table.current?.scrollToRow("9000")}
          >
            {tr("定位第 9000 行")}
          </button>
        </div>
        {expanded && (
          <p className="height-demo-explanation">
            {tr(
              "这块说明占用正常布局空间。改变窗口尺寸、展开搜索条件或切换分页后，表格数据区自动填充剩余高度。",
            )}
          </p>
        )}
      </header>
      <AutoTable<Project>
        ref={table}
        id="remaining-height"
        title={tr("自适应表格")}
        rowKey="id"
        data={count === "all" ? rows : count === "few" ? rows.slice(0, 3) : []}
        columns={columns}
        searchFields={[
          ...searchFields,
          {
            name: "owner",
            label: tr("负责人"),
            more: true,
          },
        ]}
        pageSize={100}
        pagination={pagination}
        height="auto"
      />
      <footer className="height-demo-footer">
        {tr("页脚始终位于容器底部，数据在表格内部滚动。")}
      </footer>
    </div>
  );
}
