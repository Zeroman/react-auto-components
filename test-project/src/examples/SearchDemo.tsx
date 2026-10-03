import { useEffect, useMemo, useState } from "react";
import {
  AutoSearch,
  type Field,
  matchesQuery,
  serializeRsql,
  type QueryNode,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";
import { useDemoData, makeProjects, createSource, type Project } from "../data";

export type SearchExampleKind = "instant" | "manual" | "advanced" | "remote";

export function SearchDemo({ example }: { example: SearchExampleKind }) {
  const tr = useDemoText();
  return (
    <section className="card">
      <h2>{tr("Composable Search Criteria")}</h2>
      <SearchExample key={example} example={example} />
    </section>
  );
}

function SearchExample({ example }: { example: SearchExampleKind }) {
  const tr = useDemoText();
  const { searchFields } = useDemoData();
  const [result, setResult] = useState("");
  const [queryNode, setQueryNode] = useState<QueryNode | null>(null);
  const sampleProjects = useMemo(
    () =>
      makeProjects(24).map((row) => ({
        ...row,
        name: tr(row.name),
      })),
    [tr],
  );
  const source = useMemo(() => createSource(sampleProjects), [sampleProjects]);
  const [remote, setRemote] = useState<{
    rows: Project[];
    total: number;
    loading: boolean;
    error: string;
  }>({
    rows: [],
    total: 0,
    loading: true,
    error: "",
  });
  useEffect(() => {
    if (example !== "remote") return;
    const controller = new AbortController();
    setRemote((current) => ({ ...current, loading: true, error: "" }));
    source(
      {
        pageIndex: 0,
        pageSize: 6,
        sort: [],
        filter: queryNode ?? { kind: "group", operator: "and", children: [] },
      },
      { signal: controller.signal },
    ).then(
      (response) => {
        if (!controller.signal.aborted)
          setRemote({ ...response, loading: false, error: "" });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setRemote({
            rows: [],
            total: 0,
            loading: false,
            error: String(error),
          });
      },
    );
    return () => controller.abort();
  }, [example, queryNode, source]);
  const advancedFields: Field<Project>[] = [
    {
      name: "name",
      label: tr("Keyword"),
      match: "contains",
      ignoreCase: true,
      searchFields: ["name", "owner", "region"],
    },
    {
      name: "status",
      label: tr("Status"),
      type: "select",
      multiple: true,
      options: ["In Progress", "Completed", "Pending Start"].map((value) => ({
        value,
        label: tr(value),
      })),
    },
    {
      name: "region",
      label: tr("Region"),
      type: "select",
      options: ["Shanghai", "Hangzhou", "Shenzhen"].map((value) => ({
        value,
        label: tr(value),
      })),
    },
  ];
  const matched = useMemo(() => {
    if (!queryNode) return sampleProjects;
    return sampleProjects.filter((r) => matchesQuery(r, queryNode));
  }, [sampleProjects, queryNode]);
  const hits = example === "remote" ? remote.rows : matched;
  const count = example === "remote" ? remote.total : matched.length;
  return (
    <div data-testid={`search-example-${example}`}>
      <p className="muted">
        {tr(
          example === "manual"
            ? "Edit criteria, then click Search to apply them."
            : example === "advanced"
              ? "Search project name, owner or region together, and combine multiple statuses."
              : example === "remote"
                ? "Mock server: sorting, filtering and pagination run asynchronously in the browser. No backend required."
                : "Results update as you type or select a value. Reset restores all results.",
        )}
      </p>
      <AutoSearch<Project>
        fields={example === "advanced" ? advancedFields : searchFields}
        mode={example === "manual" ? "manual" : undefined}
        onSearch={(q) => {
          setQueryNode(q);
          setResult(serializeRsql(q));
        }}
      />
      {example === "remote" && remote.loading && (
        <p role="status">{tr("Processing…")}</p>
      )}
      {example === "remote" && remote.error && (
        <p role="alert">{remote.error}</p>
      )}
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
            <h3>{tr("Real-time matches ({0} items)", [count])}</h3>
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
          {hits.slice(0, 6).map((item) => (
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
          {count === 0 && (example !== "remote" || !remote.loading) && (
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
    </div>
  );
}
