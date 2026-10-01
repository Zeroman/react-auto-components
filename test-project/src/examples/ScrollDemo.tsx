import { useMemo, useRef, useState } from "react";
import {
  AutoScroll,
  type AutoScrollHandle,
} from "@zeroman/react-auto-components";
import { useDemoText } from "../i18n";
import { makeProjects } from "../data";
import { useViewportHeight } from "../useViewportHeight";

export function ScrollDemo() {
  const tr = useDemoText();
  const viewport = useViewportHeight();
  const items = useMemo(() => makeProjects(10000), []);
  const ref = useRef<AutoScrollHandle>(null);
  const [dynamic, setDynamic] = useState(false);
  const [scrollStats, setScrollStats] = useState({
    start: 0,
    end: -1,
    scrollTop: 0,
  });
  return (
    <section className="card auto-root">
      <div className="section-heading">
        <div>
          <h2>{tr("10,000 行，也能轻快浏览")}</h2>
          <p>{tr("只渲染视口附近的数据。")}</p>
        </div>
        <div className="auto-actions">
          <label>
            <input
              type="checkbox"
              checked={dynamic}
              onChange={(e) => setDynamic(e.target.checked)}
            />
            {tr("动态行高")}
          </label>
          <button onClick={() => ref.current?.scrollToIndex(8999)}>
            {tr("跳到第 9000 行")}
          </button>
          <button onClick={() => ref.current?.reset()}>{tr("回到顶部")}</button>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          margin: "10px 0 14px",
          padding: "8px 12px",
          background: "var(--auto-muted)",
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        <span data-testid="scroll-visible-range">
          {tr("当前视口：第")}
          <strong>{scrollStats.start + 1}</strong> -{" "}
          <strong>{Math.min(items.length, scrollStats.end + 1)}</strong>
          {tr("行 / 共 10,000 行")}
        </span>
        <span>
          {tr("滚动偏移：")}
          <strong>{Math.round(scrollStats.scrollTop)}</strong> px
        </span>
        <div className="auto-actions">
          <span className="auto-muted">{tr("快速跳转:")}</span>
          <button type="button" onClick={() => ref.current?.scrollToIndex(0)}>
            {tr("#1 顶部")}
          </button>
          <button
            type="button"
            onClick={() => ref.current?.scrollToIndex(2499)}
          >
            #2500
          </button>
          <button
            type="button"
            onClick={() => ref.current?.scrollToIndex(4999)}
          >
            #5000
          </button>
          <button
            type="button"
            onClick={() => ref.current?.scrollToIndex(7499)}
          >
            #7500
          </button>
          <button
            type="button"
            onClick={() => ref.current?.scrollToIndex(9999)}
          >
            {tr("#10000 底部")}
          </button>
        </div>
      </div>
      <div className="scroll-demo-viewport" ref={viewport.ref}>
        <AutoScroll
          key={String(dynamic)}
          ref={ref}
          items={items}
          getKey={(p) => p.id}
          height={viewport.height}
          rowHeight={52}
          estimatedRowHeight={64}
          mode={dynamic ? "estimated" : "fixed"}
          onScrollChange={setScrollStats}
          renderItem={(p, i) => (
            <div
              className="virtual-project"
              style={{
                minHeight: dynamic && i % 3 === 0 ? 96 : 52,
              }}
              data-testid="virtual-row"
            >
              <span className="row-number">{i + 1}</span>
              <div>
                <strong>{tr(p.name)}</strong>
                {dynamic && i % 3 === 0 && (
                  <p>{tr("这是一行额外说明，用于验证动态高度测量。")}</p>
                )}
              </div>
              <span>{tr(p.owner)}</span>
              <span className="auto-badge">{tr(p.status)}</span>
            </div>
          )}
        />
      </div>
    </section>
  );
}
