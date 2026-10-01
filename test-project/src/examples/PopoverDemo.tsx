import { AutoPopover, useAutoPopover } from "@zeroman/react-auto-components";
import { useDemoText } from "../i18n";

export function PopoverDemo() {
  const tr = useDemoText();
  const popover = useAutoPopover();
  return (
    <section className="card auto-root">
      <h2>{tr("与内容保持恰当的距离")}</h2>
      <p className="muted">
        {tr("自动避让边界，支持悬浮、点击和命令式打开。")}
      </p>
      <div className="popover-playground">
        {(["top", "right", "bottom", "left"] as const).map((placement) => (
          <AutoPopover
            key={placement}
            placement={placement}
            content={
              <div>
                <strong>{tr("{0} 浮层", [placement])}</strong>
                <p>{tr("这里可以放置任意 React 内容。")}</p>
              </div>
            }
          >
            <button>{placement}</button>
          </AutoPopover>
        ))}
        <AutoPopover trigger="hover" content={tr("移动到内容区仍保持打开")}>
          <button>{tr("悬浮提示")}</button>
        </AutoPopover>
        <button
          onClick={(e) =>
            popover.show({
              anchor: e.currentTarget,
              content: <p>{tr("命令式浮层内容")}</p>,
            })
          }
        >
          {tr("命令式打开")}
        </button>
        <AutoPopover
          placement="bottom"
          content={
            <div
              style={{
                minWidth: 220,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span className="avatar">CY</span>
                <div>
                  <strong>{tr("陈若林")}</strong>
                  <div
                    className="auto-muted"
                    style={{
                      fontSize: 12,
                    }}
                  >
                    {tr("前端工程架构组")}
                  </div>
                </div>
              </div>
              <p
                style={{
                  margin: "4px 0 10px",
                  fontSize: 12,
                  color: "var(--auto-secondary)",
                }}
              >
                {tr("负责 TanStack 虚拟化集成与配置驱动渲染管线。")}
              </p>
              <div className="auto-actions">
                <span className="auto-badge">{tr("研发负责人")}</span>
                <span className="auto-badge">{tr("上海")}</span>
              </div>
            </div>
          }
        >
          <button>{tr("名片浮层")}</button>
        </AutoPopover>
      </div>
    </section>
  );
}
