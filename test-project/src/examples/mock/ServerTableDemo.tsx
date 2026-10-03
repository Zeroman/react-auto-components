import { useEffect, useRef, useState } from "react";
import {
  AutoTable,
  matchesQuery,
  type AutoColumn,
  type DataSource,
  type TableQuery,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../../i18n";
import { MockDemo, mockRequest, type MockScenario } from "./MockDemo";
import {
  mapSearchFields,
  projectFields,
  projectRecords,
  type SearchFieldSchema,
  type SearchRecord,
} from "./ServerSearchDemo";

interface TableResponse {
  columns: { key: keyof SearchRecord; label: string; type?: "number" }[];
  searchFields: SearchFieldSchema[];
  permissions: { edit: boolean };
  pageSize: number;
  records: SearchRecord[];
}
const loadTable = (scenario: MockScenario, signal: AbortSignal) =>
  mockRequest<TableResponse>(
    {
      columns: [
        { key: "name", label: "Project Name" },
        { key: "status", label: "Status" },
        { key: "region", label: "Region" },
        ...(scenario === "restricted"
          ? []
          : [
              {
                key: "budget" as const,
                label: "Budget",
                type: "number" as const,
              },
            ]),
      ],
      searchFields: projectFields(scenario === "restricted"),
      permissions: { edit: scenario !== "restricted" },
      pageSize: 5,
      records: projectRecords(scenario),
    },
    { signal },
  );
export function ServerTableDemo() {
  return (
    <MockDemo
      title="mock.table.title"
      description="mock.table.description"
      load={loadTable}
    >
      {({ data, scenario }) => <ProjectTable data={data} scenario={scenario} />}
    </MockDemo>
  );
}
function ProjectTable({
  data,
  scenario,
}: {
  data: TableResponse;
  scenario: MockScenario;
}) {
  const tr = useDemoText();
  const records = useRef(data.records);
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);
  const [exchange, setExchange] = useState<{
    request: TableQuery;
    response: { rows: SearchRecord[]; total: number } | null;
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const source: DataSource<SearchRecord> = async (query, { signal }) => {
    setExchange({ request: query, response: null });
    const rows = records.current.filter((row) =>
      matchesQuery(row, query.filter),
    );
    rows.sort((a, b) => {
      for (const sort of query.sort) {
        const av = a[sort.id as keyof SearchRecord] ?? "",
          bv = b[sort.id as keyof SearchRecord] ?? "";
        const order = av === bv ? 0 : av > bv ? 1 : -1;
        if (order) return sort.desc ? -order : order;
      }
      return 0;
    });
    const response = await mockRequest(
      {
        rows: rows.slice(
          query.pageIndex * query.pageSize,
          (query.pageIndex + 1) * query.pageSize,
        ),
        total: rows.length,
      },
      { signal },
    );
    if (!signal.aborted) setExchange({ request: query, response });
    return response;
  };
  const columns: AutoColumn<SearchRecord>[] = data.columns.map((column) => ({
    ...column,
    label: tr(column.label),
    sortable: true,
    format: (value) => (typeof value === "string" ? tr(value) : (value ?? "")),
  }));
  return (
    <div>
      <p>
        {tr(
          data.permissions.edit ? "mock.table.editable" : "mock.table.readonly",
        )}
      </p>
      <AutoTable<SearchRecord>
        id={`server-projects-${scenario}`}
        rowKey="id"
        columns={columns}
        dataSource={source}
        searchFields={mapSearchFields(data.searchFields, tr)}
        pageSize={data.pageSize}
        height={340}
        formFields={
          data.permissions.edit
            ? mapSearchFields(data.searchFields, tr).map((field) => ({
                ...field,
                required: true,
              }))
            : undefined
        }
        onEdit={
          data.permissions.edit
            ? async (row, values) => {
                const controller = lifetime.current;
                const response = await mockRequest(
                  { ...row, ...values, id: row.id },
                  { signal: controller.signal },
                );
                if (!controller.signal.aborted) {
                  records.current = records.current.map((item) =>
                    item.id === row.id ? response : item,
                  );
                  setSaved(true);
                }
              }
            : undefined
        }
      />
      {saved && <p role="status">{tr("mock.table.saved")}</p>}
      <details open>
        <summary>{tr("mock.table.exchange")}</summary>
        <pre data-testid="mock-table-exchange">
          {JSON.stringify(exchange, null, 2)}
        </pre>
      </details>
    </div>
  );
}
