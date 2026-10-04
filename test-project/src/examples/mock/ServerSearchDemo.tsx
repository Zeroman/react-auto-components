import { useEffect, useState } from "react";
import {
  AutoSearch,
  buildQuery,
  matchesQuery,
  type Field,
  type QueryNode,
} from "@zeroman.yang/react-auto-components";
import { makeProjects } from "../../data";
import { useDemoText } from "../../i18n";
import { MockDemo, mockRequest, type MockScenario } from "./MockDemo";

export type SearchRecord = {
  id: string;
  name: string;
  status: string;
  region: string;
  budget?: number;
};
export type SearchFieldSchema = {
  name: "name" | "status" | "region";
  label: string;
  type: "input" | "select";
  options?: string[];
  match?: "contains";
};
export function projectFields(restricted: boolean): SearchFieldSchema[] {
  return [
    { name: "name", label: "Project Name", type: "input", match: "contains" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: restricted
        ? ["In Progress"]
        : ["In Progress", "Completed", "Pending Start"],
    },
    ...(!restricted
      ? [
          {
            name: "region" as const,
            label: "Region",
            type: "select" as const,
            options: ["Shanghai", "Hangzhou", "Shenzhen"],
          },
        ]
      : []),
  ];
}
export function mapSearchFields(
  schema: SearchFieldSchema[],
  tr: (key: string) => string,
): Field<SearchRecord>[] {
  return schema.map((field): Field<SearchRecord> =>
    field.type === "select"
      ? {
          name: field.name,
          label: tr(field.label),
          type: "select",
          options: (field.options ?? []).map((value) => ({
            value,
            label: tr(value),
          })),
        }
      : {
          name: field.name,
          type: "input",
          label: tr(field.label),
          search: field.match
            ? { match: field.match, ignoreCase: true }
            : undefined,
        },
  );
}
export function projectRecords(scenario: MockScenario): SearchRecord[] {
  return makeProjects(scenario === "empty" ? 0 : 24)
    .filter((row) => scenario !== "restricted" || row.status === "In Progress")
    .map(({ id, name, status, region, budget }) => ({
      id,
      name,
      status,
      region,
      ...(scenario !== "restricted" ? { budget } : {}),
    }));
}
interface SearchResponse {
  fields: SearchFieldSchema[];
  defaults: Partial<SearchRecord>;
  records: SearchRecord[];
}
const loadSearch = (scenario: MockScenario, signal: AbortSignal) =>
  mockRequest<SearchResponse>(
    {
      fields: projectFields(scenario === "restricted"),
      defaults: scenario === "restricted" ? { status: "In Progress" } : {},
      records: projectRecords(scenario),
    },
    { signal },
  );
export function ServerSearchDemo() {
  return (
    <MockDemo
      title="mock.search.title"
      description="mock.search.description"
      load={loadSearch}
    >
      {({ data }) => <SearchResults data={data} />}
    </MockDemo>
  );
}
function SearchResults({ data }: { data: SearchResponse }) {
  const tr = useDemoText();
  const fields = mapSearchFields(data.fields, tr);
  const [query, setQuery] = useState<QueryNode>(() =>
    buildQuery(data.defaults as SearchRecord, fields),
  );
  const [revision, setRevision] = useState(0);
  const [fail, setFail] = useState(false);
  const [result, setResult] = useState<{
    rows: SearchRecord[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const rows = data.records.filter((row) => matchesQuery(row, query));
    mockRequest(
      { rows, total: rows.length },
      { signal: controller.signal, fail },
    ).then(
      (response) => {
        if (!controller.signal.aborted) {
          setResult(response);
          setLoading(false);
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setError(true);
          setLoading(false);
        }
      },
    );
    return () => controller.abort();
  }, [data, query, revision, fail]);
  return (
    <div>
      <AutoSearch<SearchRecord>
        fields={fields}
        defaultValue={data.defaults}
        onSearch={setQuery}
      />
      <button
        type="button"
        onClick={() => {
          setFail(true);
          setRevision((value) => value + 1);
        }}
      >
        {tr("mock.search.fail")}
      </button>
      {loading ? (
        <p role="status">{tr("mock.loading")}</p>
      ) : error ? (
        <p role="alert">
          {tr("mock.requestFailed")}{" "}
          <button
            type="button"
            onClick={() => {
              setFail(false);
              setRevision((value) => value + 1);
            }}
          >
            {tr("mock.retry")}
          </button>
        </p>
      ) : (
        <>
          <p data-testid="mock-search-count" role="status">
            {tr("mock.search.count", [result?.total ?? 0])}
          </p>
          <ul data-testid="mock-search-results">
            {result?.rows.map((row) => (
              <li key={row.id}>
                <strong>{tr(row.name)}</strong> · {tr(row.status)} ·{" "}
                {tr(row.region)}
              </li>
            ))}
          </ul>
          {!result?.total && <p>{tr("mock.search.empty")}</p>}
        </>
      )}
      <details open>
        <summary>{tr("mock.search.exchange")}</summary>
        <pre data-testid="mock-search-exchange">
          {JSON.stringify(
            { request: query, response: loading || error ? null : result },
            null,
            2,
          )}
        </pre>
      </details>
    </div>
  );
}
