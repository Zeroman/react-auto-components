import { useMemo, useState } from "react";
import {
  AutoSearchPanel,
  matchesQuery,
  serializeRsql,
  type QueryNode,
} from "@zeroman/react-auto-components";
import { useDemoText } from "../i18n";
import { useDemoData, makeProjects, type Project } from "../data";

export function SearchDemo() {
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
