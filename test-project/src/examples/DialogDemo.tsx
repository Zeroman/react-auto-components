import { useState } from "react";
import { useAutoDialog } from "@zeroman/react-auto-components";
import { useDemoText } from "../i18n";
import { useDemoData, type Project } from "../data";
import { Metric } from "../Metric";

export function DialogDemo() {
  const tr = useDemoText();
  const { fields } = useDemoData();
  const dialog = useAutoDialog();
  const [result, setResult] = useState("");
  return (
    <section className="card auto-root">
      <h2>{tr("让编辑流程保持完整")}</h2>
      <p className="muted">
        {tr("取消会保留草稿；提交成功后清除。支持拖动和全屏。")}
      </p>
      <div className="auto-actions">
        <button
          className="auto-primary"
          onClick={() =>
            dialog.open<Project>({
              title: tr("新建项目"),
              fields,
              defaultValue: {
                name: "",
              },
              draftKey: "demo-project",
              draggable: true,
              showReset: true,
              onSubmit: (value) => setResult(tr("已保存：{0}", [value.name])),
            })
          }
        >
          {tr("打开表单弹窗")}
        </button>
        <button
          onClick={() =>
            dialog.open({
              title: tr("关闭拦截示例"),
              content: <p>{tr("取消操作会被拦截，点击确定即可关闭。")}</p>,
              beforeClose: (reason) => reason === "submit",
            })
          }
        >
          {tr("测试关闭拦截")}
        </button>
        <button
          onClick={() =>
            dialog.open({
              title: tr("第一层"),
              content: (
                <button
                  onClick={() =>
                    dialog.open({
                      title: tr("第二层"),
                      content: <p>{tr("嵌套弹窗会恢复到正确的焦点。")}</p>,
                    })
                  }
                >
                  {tr("打开第二层")}
                </button>
              ),
            })
          }
        >
          {tr("嵌套弹窗")}
        </button>
        <button
          onClick={() =>
            dialog.open({
              title: tr("高危归档操作确认"),
              content: (
                <div>
                  <p
                    style={{
                      color: "var(--auto-danger)",
                      fontWeight: 600,
                      margin: "0 0 8px",
                    }}
                  >
                    {tr("警告：此操作将永久冻结该业务单元全部资源与子任务！")}
                  </p>
                  <p
                    className="auto-muted"
                    style={{
                      margin: 0,
                      fontSize: 13,
                    }}
                  >
                    {tr("系统将保存审计日志。请核对权限后操作。")}
                  </p>
                </div>
              ),
              confirmLabel: tr("确认归档"),
              cancelLabel: tr("放弃"),
              onSubmit: () => setResult(tr("已确认执行高危归档操作")),
            })
          }
        >
          {tr("高危确认弹窗")}
        </button>
        <button
          onClick={() =>
            dialog.open({
              title: tr("全屏数据展示工作区"),
              fullscreen: true,
              content: (
                <div
                  style={{
                    padding: 12,
                  }}
                >
                  <h3>{tr("全屏模式工作区")}</h3>
                  <p className="auto-muted">
                    {tr(
                      "支持复杂业务流、图表分析与多级表格，按 Esc 或右上角关闭返回。",
                    )}
                  </p>
                  <div
                    className="metrics"
                    style={{
                      margin: "20px 0",
                    }}
                  >
                    <Metric
                      label={tr("节点健康度")}
                      value="100"
                      unit="%"
                      detail={tr("全域集群正常")}
                    />
                    <Metric
                      label={tr("并发处理")}
                      value="1,240"
                      unit="qps"
                      detail={tr("平均响应 18ms")}
                    />
                    <Metric
                      label={tr("内存开销")}
                      value="14"
                      unit="MB"
                      detail={tr("TanStack 虚拟化优化")}
                    />
                  </div>
                </div>
              ),
            })
          }
        >
          {tr("全屏模式弹窗")}
        </button>
        <button
          onClick={() => {
            localStorage.removeItem("auto-studio:draft:demo-project");
            setResult(tr("已重置新建项目草稿"));
          }}
        >
          {tr("重置弹窗草稿")}
        </button>
      </div>
      <p role="status">{result}</p>
    </section>
  );
}
