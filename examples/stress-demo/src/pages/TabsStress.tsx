import { useEffect, useMemo, useRef, useState } from "react";
import { AutoTabs, type AutoTab } from "@zeroman.yang/react-auto-components";

function makeTabs(count: number): AutoTab[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `t-${i + 1}`,
    label: `Tab ${String(i + 1).padStart(2, "0")} · ${"项目".repeat((i % 3) + 1)}`,
    content: (
      <div className="panel" style={{ marginTop: 8 }}>
        <h3>面板 {i + 1}</h3>
        <p>keepMounted 下切换应保留本地输入。</p>
        <input aria-label={`scratch-${i + 1}`} defaultValue={`draft-${i + 1}`} />
      </div>
    ),
    children:
      i % 7 === 0
        ? [
            {
              id: `t-${i + 1}-a`,
              label: "Nested A",
              content: <p>嵌套 A</p>,
            },
            {
              id: `t-${i + 1}-b`,
              label: "Nested B",
              content: <p>嵌套 B</p>,
            },
          ]
        : undefined,
  }));
}

export function TabsStress() {
  const [count, setCount] = useState(40);
  const [value, setValue] = useState<readonly string[]>(["t-1"]);
  const [log, setLog] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const items = useMemo(() => makeTabs(count), [count]);
  // Navigating away mid-switch must not keep selecting tabs on an unmounted page.
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  return (
    <div>
      <header className="page-head">
        <h1>AutoTabs 极限</h1>
        <p>大量标签溢出滚动、嵌套子页、以及程序化快速切换。</p>
      </header>
      <div className="toolbar">
        <label>
          数量{" "}
          <select
            value={count}
            onChange={(e) => {
              const n = Number(e.target.value);
              setCount(n);
              setValue(["t-1"]);
            }}
          >
            {[20, 40, 80].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="primary"
          onClick={() => {
            if (timer.current) clearInterval(timer.current);
            let i = 0;
            const id = setInterval(() => {
              i += 1;
              const next = `t-${(i % count) + 1}`;
              setValue([next]);
              if (i >= count * 2) {
                clearInterval(id);
                timer.current = null;
                setLog(`rapid switched ${count * 2} times → ${next}`);
              }
            }, 40);
            timer.current = id;
          }}
        >
          快速切换两轮
        </button>
        <span className="metric">path {value.join("/")}</span>
      </div>
      <div className="panel">
        <AutoTabs
          items={items}
          value={value}
          onChange={(path) => setValue(path)}
          keepMounted
        />
      </div>
      {log && <pre className="log">{log}</pre>}
      <p className="note">
        每第 7 个标签带嵌套 children。快速切换后检查输入框草稿是否仍在、控制台无报错。
      </p>
    </div>
  );
}
