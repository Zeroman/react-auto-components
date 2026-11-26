import { useMemo, useState } from "react";
import {
  AutoTable,
  type AutoColumn,
  type Field,
} from "@zeroman.yang/react-auto-components";

type Row = {
  id: string;
  name: string;
  owner: string;
  status: string;
  note: string;
  wide: string;
} & Record<`w${number}`, string>;

const statuses = ["open", "busy", "done"] as const;
const owners = ["Ada", "Lin", "Kai", "Nori", "Sam"];

function makeRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => {
    const wideFields = Object.fromEntries(
      Array.from({ length: 40 }, (__, w) => [`w${w}`, `c${w}-${i % 17}`]),
    ) as Record<`w${number}`, string>;
    return {
      id: String(i + 1),
      name: `Row-${(i * 7) % 997}`,
      owner: owners[i % owners.length],
      status: statuses[i % statuses.length],
      note:
        i % 41 === 0
          ? `超长单元格 ${"漢".repeat(120)} / ${"x".repeat(240)} #${i}`
          : `note-${i % 50}`,
      wide: `col-extra-${i % 17}`,
      ...wideFields,
    };
  });
}

const baseColumns: AutoColumn<Row>[] = [
  { key: "id", label: "Id", width: 80, sortable: true },
  { key: "name", label: "Name", width: 140, sortable: true },
  { key: "owner", label: "Owner", width: 100, sortable: true },
  { key: "status", label: "Status", width: 100, sortable: true },
  { key: "note", label: "Note", width: 280 },
];

export function TableStress() {
  const [mode, setMode] = useState<
    "large" | "empty" | "wide" | "dynamic" | "long"
  >("large");
  const [rowCount, setRowCount] = useState(100_000);
  const [extraCols, setExtraCols] = useState(0);
  const rows = useMemo(() => {
    if (mode === "empty") return [] as Row[];
    if (mode === "long") return makeRows(200);
    if (mode === "wide" || mode === "dynamic") return makeRows(5_000);
    return makeRows(rowCount);
  }, [mode, rowCount]);

  const columns = useMemo(() => {
    if (mode === "wide") {
      return [
        ...baseColumns,
        ...Array.from({ length: 40 }, (_, i) => ({
          key: `w${i}`,
          label: `W${i + 1}-${"列".repeat(3)}`,
          width: 120,
        })),
      ] as AutoColumn<Row>[];
    }
    if (mode === "dynamic") {
      return [
        ...baseColumns,
        ...Array.from({ length: extraCols }, (_, i) => ({
          key: `w${i}`,
          label: `Dyn ${i + 1}`,
          width: 110,
        })),
      ] as AutoColumn<Row>[];
    }
    if (mode === "long") {
      return baseColumns.map((c) =>
        c.key === "note" ? { ...c, width: 480 } : c,
      );
    }
    return baseColumns;
  }, [mode, extraCols]);

  const formFields: Field<Row>[] = [
    { name: "name", label: "Name", required: true },
    { name: "owner", label: "Owner" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: statuses.map((value) => ({ value, label: value })),
    },
    { name: "note", label: "Note", span: 2 },
  ];

  return (
    <div>
      <header className="page-head">
        <h1>AutoTable 极限</h1>
        <p>
          10 万行虚拟滚动、空数据、超宽列、运行时增删列、超长单元格文本。观察滚动卡顿与控制台报错。
        </p>
      </header>
      <div className="toolbar">
        {(
          [
            ["large", "10万行"],
            ["empty", "0 行"],
            ["wide", "超宽列"],
            ["dynamic", "动态列"],
            ["long", "超长单元格"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={mode === id ? "primary" : undefined}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
        {mode === "large" && (
          <label>
            行数{" "}
            <select
              value={rowCount}
              onChange={(e) => setRowCount(Number(e.target.value))}
            >
              {[10_000, 50_000, 100_000].map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString("en-US")}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === "dynamic" && (
          <>
            <button type="button" onClick={() => setExtraCols((n) => n + 1)}>
              +列
            </button>
            <button
              type="button"
              onClick={() => setExtraCols((n) => Math.max(0, n - 1))}
            >
              −列
            </button>
            <span className="metric">额外列 {extraCols}</span>
          </>
        )}
        <span className="metric">rows {rows.length.toLocaleString("en-US")}</span>
      </div>
      <div className="panel table-frame">
        <AutoTable<Row>
          key={`${mode}-${rowCount}-${extraCols}-${columns.length}`}
          id={`stress-table-${mode}`}
          title={`Stress · ${mode}`}
          rowKey="id"
          data={rows}
          columns={columns}
          formFields={formFields}
          pagination={mode === "empty" || mode === "long"}
          pageSize={20}
          height="auto"
          virtual
        />
      </div>
      <p className="note">
        large / wide / dynamic 关闭分页并开启 virtual，父容器固定高度。空表应仍渲染工具栏且无异常。
      </p>
    </div>
  );
}
