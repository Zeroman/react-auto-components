import { useEffect, useMemo, useRef, useState } from "react";
import {
  AutoSearch,
  serializeRsql,
  type Field,
  type QueryNode,
} from "@zeroman.yang/react-auto-components";

type Filter = Record<string, unknown>;

function manySearchFields(count: number): Field<Filter>[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `q${i}`,
    label: `Q${i}`,
    search: {
      match: "contains" as const,
      more: i >= 6,
    },
  }));
}

export function SearchStress() {
  const [fieldCount, setFieldCount] = useState(24);
  const [narrow, setNarrow] = useState(false);
  const [value, setValue] = useState<Filter>({});
  const [log, setLog] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [bursting, setBursting] = useState(false);
  const failNext = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fields = useMemo(() => manySearchFields(fieldCount), [fieldCount]);

  const stopBurst = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setBursting(false);
  };
  // Leaving the route mid-burst must not keep writing into an unmounted search.
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  return (
    <div>
      <header className="page-head">
        <h1>AutoSearch 极限</h1>
        <p>
          大量筛选字段（含 more）、即时模式连打、搜索失败保留草稿、极窄容器布局。
        </p>
      </header>
      <div className="toolbar">
        <label>
          字段{" "}
          <select
            value={fieldCount}
            onChange={(e) => setFieldCount(Number(e.target.value))}
          >
            {[12, 24, 48].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={narrow}
            onChange={(e) => setNarrow(e.target.checked)}
          />{" "}
          极窄宽度 (220px)
        </label>
        <button
          type="button"
          className="primary"
          onClick={() => {
            if (bursting) {
              stopBurst();
              return;
            }
            setBursting(true);
            let n = 0;
            timer.current = setInterval(() => {
              n += 1;
              setValue((current) => ({ ...current, q0: `burst-${n}` }));
              if (n >= 60) {
                stopBurst();
                setLog(`burst finished ${n} updates`);
              }
            }, 30);
          }}
        >
          {bursting ? "停止连打" : "连打受控 value"}
        </button>
        <button
          type="button"
          onClick={() => {
            failNext.current = true;
            setLog("下一次 onSearch 将抛错");
          }}
        >
          下次搜索失败
        </button>
      </div>
      <div
        className="panel"
        style={narrow ? { width: 220, overflow: "auto" } : undefined}
      >
        <AutoSearch<Filter>
          key={fieldCount}
          fields={fields}
          columns={narrow ? 1 : 3}
          mode="instant"
          moreLayout="popover"
          value={value}
          onChange={setValue}
          onSearch={async (query: QueryNode, values) => {
            if (failNext.current) {
              failNext.current = false;
              throw new Error("模拟搜索失败：草稿应保留");
            }
            const rsql = serializeRsql(query);
            setLastQuery(rsql || "(empty query)");
            setLog(`search ok · keys=${Object.keys(values).length}`);
          }}
        />
      </div>
      {lastQuery && <pre className="log">{lastQuery}</pre>}
      {log && <p className="note">{log}</p>}
      <p className="note">
        即时搜索下连打 q0；失败路径应显示错误且不重置已填值。窄宽度检查换行与 more
        popover。
      </p>
    </div>
  );
}
