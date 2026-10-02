import { useMemo, useState } from "react";
import {
  AutoSearch,
  matchesQuery,
  serializeRsql,
  type QueryNode,
} from "@zeroman.yang/react-auto-components";
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
      <h2>{tr("Composable Search Criteria")}</h2>
      <label className="auto-root">
        <input
          type="checkbox"
          checked={instant}
          onChange={(e) => setInstant(e.target.checked)}
        />
        {tr("Instant Search")}
      </label>
      <AutoSearch<Project>
        fields={searchFields}
        mode={instant ? "instant" : "manual"}
        onSearch={(q) => {
          setQueryNode(q);
          setResult(serializeRsql(q));
        }}
      />
      <div className="code-card">
        <pre data-testid="query-result">
          {result || tr("// RSQL query shown after searching")}
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
            <h3>{tr("Real-time matches ({0} items)", [matched.length])}</h3>
            <p className="muted">
              {tr(
                "A sample dataset filtered in real time by the search criteria above.",
              )}
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
              <div className="search-hit">
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
                {tr("Owner: {0} · Region: {1} · Budget: ¥ {2}", [
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
              {tr("No records match the search criteria")}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
