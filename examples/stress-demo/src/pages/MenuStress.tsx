import { useEffect, useMemo, useRef, useState } from "react";
import { AutoMenu, type AutoMenuItem } from "@zeroman.yang/react-auto-components";

function deepItems(depth: number, breadth: number, prefix = "n"): AutoMenuItem[] {
  if (depth <= 0) {
    return Array.from({ length: breadth }, (_, i) => ({
      id: `${prefix}-${i}`,
      label: `Leaf ${prefix}-${i}`,
      badge: i % 4 === 0 ? i + 1 : undefined,
    }));
  }
  return Array.from({ length: breadth }, (_, i) => ({
    id: `${prefix}-${i}`,
    label: `Node ${prefix}-${i}`,
    children: deepItems(depth - 1, Math.max(2, breadth - 1), `${prefix}-${i}`),
  }));
}

export function MenuStress() {
  const [mode, setMode] = useState<"deep" | "tiny" | "toggle">("deep");
  const [value, setValue] = useState<string>("n-0-0-0-0");
  const [collapsed, setCollapsed] = useState(false);
  const [log, setLog] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const items = useMemo(() => deepItems(4, 4), []);
  // Navigating away mid-toggle must not keep collapsing an unmounted menu.
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  return (
    <div>
      <header className="page-head">
        <h1>AutoMenu 极限</h1>
        <p>深嵌套树、折叠轨道快速切换、以及塞进极小容器时的可滚动性。</p>
      </header>
      <div className="toolbar">
        {(
          [
            ["deep", "深嵌套"],
            ["tiny", "极小容器"],
            ["toggle", "快速折叠"],
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
        {mode === "toggle" && (
          <button
            type="button"
            onClick={() => {
              if (timer.current) clearInterval(timer.current);
              let n = 0;
              const id = setInterval(() => {
                n += 1;
                setCollapsed((c) => !c);
                if (n >= 30) {
                  clearInterval(id);
                  timer.current = null;
                  setLog("collapsed toggled 30 times");
                }
              }, 40);
              timer.current = id;
            }}
          >
            连折 30 次
          </button>
        )}
        <span className="metric">selected {value}</span>
      </div>
      <div
        className={mode === "tiny" ? "tiny-box" : "panel"}
        style={mode === "tiny" ? { width: 120, height: 160, resize: "both" } : undefined}
      >
        <div className="split" style={mode === "tiny" ? { gridTemplateColumns: "1fr", minHeight: 0 } : undefined}>
          <AutoMenu
            label="Stress menu"
            items={items}
            value={value}
            onChange={(id, _item, path) => {
              setValue(id);
              setLog(`onChange ${id} · path=${path.join("/")}`);
            }}
            collapsible
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
          />
          {mode !== "tiny" && (
            <div className="panel">
              <p>当前选中：{value}</p>
              <p className="note" style={{ marginTop: 0 }}>
                深树约 4 层 × 递减宽度。极小容器可拖拽右下角缩放，检查裁剪与滚动。
              </p>
            </div>
          )}
        </div>
      </div>
      {log && <pre className="log">{log}</pre>}
    </div>
  );
}
