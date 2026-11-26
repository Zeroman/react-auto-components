import { useEffect, useRef, useState } from "react";
import { AutoFocus } from "@zeroman.yang/react-auto-components";

export function FocusStress() {
  const [showA, setShowA] = useState(true);
  const [showB, setShowB] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [tiny, setTiny] = useState(false);
  const [log, setLog] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Navigating away mid-toggle must not keep remounting an unmounted page's inputs.
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  return (
    <div>
      <header className="page-head">
        <h1>AutoFocus 极限</h1>
        <p>
          多实例竞争（后注册可见项获胜）、显隐切换、禁用注册、以及 0
          尺寸/极小容器中的目标发现。
        </p>
      </header>
      <div className="toolbar">
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />{" "}
          启用 AutoFocus
        </label>
        <label>
          <input
            type="checkbox"
            checked={showA}
            onChange={(e) => setShowA(e.target.checked)}
          />{" "}
          显示 A
        </label>
        <label>
          <input
            type="checkbox"
            checked={showB}
            onChange={(e) => setShowB(e.target.checked)}
          />{" "}
          显示 B
        </label>
        <label>
          <input
            type="checkbox"
            checked={tiny}
            onChange={(e) => setTiny(e.target.checked)}
          />{" "}
          极小/零尺寸盒
        </label>
        <button
          type="button"
          onClick={() => {
            if (timer.current) clearInterval(timer.current);
            let n = 0;
            const id = setInterval(() => {
              n += 1;
              setShowA((v) => !v);
              setShowB((v) => !v);
              if (n >= 20) {
                clearInterval(id);
                timer.current = null;
                setShowA(true);
                setShowB(true);
                setLog("toggled visibility 20 times");
              }
            }, 60);
            timer.current = id;
          }}
        >
          狂切显隐
        </button>
      </div>
      <div className="panel" style={{ display: "grid", gap: 12 }}>
        {showA && (
          <AutoFocus disabled={!enabled}>
            <label>
              Focus A{" "}
              <input
                aria-label="focus-a"
                onFocus={() => setLog("focus → A")}
              />
            </label>
          </AutoFocus>
        )}
        {showB && (
          <AutoFocus disabled={!enabled} target='[data-focus="b"]'>
            <button type="button">忽略我</button>
            <label>
              Focus B{" "}
              <input
                data-focus="b"
                aria-label="focus-b"
                onFocus={() => setLog("focus → B")}
              />
            </label>
          </AutoFocus>
        )}
        <div className={tiny ? "tiny-box" : undefined}>
          <AutoFocus disabled={!enabled || !tiny} target="textarea">
            <button type="button">toolbar</button>
            <textarea
              aria-label="focus-tiny"
              rows={3}
              defaultValue="极小容器内的 textarea"
              onFocus={() => setLog("focus → tiny textarea")}
            />
          </AutoFocus>
        </div>
        <div className="zero-box" aria-hidden={!tiny}>
          <AutoFocus disabled={!enabled || !tiny}>
            <input aria-label="focus-zero" onFocus={() => setLog("focus → zero box")} />
          </AutoFocus>
        </div>
      </div>
      {log && <pre className="log">{log}</pre>}
      <p className="note">
        同时显示 A/B 时，后挂载的 B 应赢得焦点。隐藏赢家后焦点应落到仍可见的注册项。零尺寸盒内目标通常不可见，不应误抢焦点。
      </p>
    </div>
  );
}
