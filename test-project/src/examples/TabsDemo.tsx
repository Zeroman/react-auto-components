import { useState } from "react";
import { AutoTabs } from "@zeroman/react-auto-components";
import { useDemoText } from "../i18n";

export function TabsDemo() {
  const tr = useDemoText();
  const [mode, setMode] = useState<"horizontal" | "vertical">("horizontal");
  const [localSize, setLocalSize] = useState<
    "inherit" | "small" | "medium" | "large"
  >("inherit");
  const [localDensity, setLocalDensity] = useState<
    "inherit" | "compact" | "comfortable"
  >("inherit");
  return (
    <section className="card auto-root">
      <div className="section-heading">
        <div>
          <h2>{tr("导航与内容，自然衔接")}</h2>
          <p
            className="auto-muted"
            style={{
              margin: "4px 0 0",
              fontSize: 13,
            }}
          >
            {tr("支持全局/局部三种尺寸（大中小）与紧凑/舒适度无缝切换。")}
          </p>
        </div>
        <div className="auto-actions">
          <select
            aria-label={tr("标签模式")}
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="horizontal">{tr("横向标签")}</option>
            <option value="vertical">{tr("纵向标签")}</option>
          </select>
          <select
            aria-label={tr("局部标签尺寸")}
            value={localSize}
            onChange={(e) => setLocalSize(e.target.value as typeof localSize)}
          >
            <option value="inherit">{tr("尺寸: 继承全局")}</option>
            <option value="small">{tr("尺寸: 小 (S)")}</option>
            <option value="medium">{tr("尺寸: 中 (M)")}</option>
            <option value="large">{tr("尺寸: 大 (L)")}</option>
          </select>
          <select
            aria-label={tr("局部标签紧凑度")}
            value={localDensity}
            onChange={(e) =>
              setLocalDensity(e.target.value as typeof localDensity)
            }
          >
            <option value="inherit">{tr("紧凑度: 继承全局")}</option>
            <option value="compact">{tr("紧凑 (compact)")}</option>
            <option value="comfortable">{tr("舒适 (comfortable)")}</option>
          </select>
        </div>
      </div>
      <AutoTabs
        mode={mode}
        size={localSize === "inherit" ? undefined : localSize}
        density={localDensity === "inherit" ? undefined : localDensity}
        extra={
          <span
            className="auto-badge"
            style={{
              alignSelf: "center",
            }}
          >
            {tr("保持挂载 / 状态持久")}
          </span>
        }
        items={[
          {
            id: "overview",
            label: tr("概览"),
            content: (
              <div className="tab-demo-content">
                <h3>{tr("项目概览")}</h3>
                <p>{tr("切换标签时，已填写的内容会保留。")}</p>
                <input
                  aria-label={tr("标签草稿")}
                  placeholder={tr("在这里输入一些内容…")}
                />
              </div>
            ),
          },
          {
            id: "settings",
            label: tr("配置"),
            children: [
              {
                id: "general",
                label: tr("常规"),
                content: <p>{tr("常规配置内容")}</p>,
              },
              {
                id: "access",
                label: tr("权限"),
                content: <p>{tr("权限配置内容")}</p>,
              },
            ],
          },
          {
            id: "activity",
            label: tr("动态"),
            badge: "NEW",
            content: (
              <div className="tab-demo-content">
                <h3>{tr("活动追踪与审计")}</h3>
                <p className="auto-muted">
                  {tr("展示微前端与复杂面板多标签场景下的动态通知标记。")}
                </p>
                <div
                  className="auto-actions"
                  style={{
                    marginTop: 12,
                  }}
                >
                  <span className="auto-badge">{tr("v0.1.0 稳定构建")}</span>
                  <span className="auto-badge">{tr("100% 独立单测通过")}</span>
                </div>
              </div>
            ),
          },
          {
            id: "disabled",
            label: tr("归档"),
            disabled: true,
          },
        ]}
      />
    </section>
  );
}
