import { useState } from "react";
import { AutoTabs } from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";
import { DynamicTabsDemo } from "./DynamicTabsDemo";
import { TabsStateDemo } from "./TabsStateDemo";

export function TabsDemo() {
  const tr = useDemoText();
  const [mode, setMode] = useState<"horizontal" | "vertical">("horizontal");
  const [localSize, setLocalSize] = useState<
    "inherit" | "small" | "medium" | "large"
  >("inherit");
  const [localDensity, setLocalDensity] = useState<
    "inherit" | "compact" | "comfortable"
  >("inherit");
  const size = localSize === "inherit" ? undefined : localSize;
  const density = localDensity === "inherit" ? undefined : localDensity;
  return (
    <section className="card auto-root">
      <div className="auto-actions tabs-demo-controls">
        <select
          aria-label={tr("Tab mode")}
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
        >
          <option value="horizontal">{tr("Horizontal tabs")}</option>
          <option value="vertical">{tr("Vertical tabs")}</option>
        </select>
        <select
          aria-label={tr("Local tab size")}
          value={localSize}
          onChange={(e) => setLocalSize(e.target.value as typeof localSize)}
        >
          <option value="inherit">{tr("Size: inherit global")}</option>
          <option value="small">{tr("Size: Small (S)")}</option>
          <option value="medium">{tr("Size: Medium (M)")}</option>
          <option value="large">{tr("Size: Large (L)")}</option>
        </select>
        <select
          aria-label={tr("Local tab density")}
          value={localDensity}
          onChange={(e) =>
            setLocalDensity(e.target.value as typeof localDensity)
          }
        >
          <option value="inherit">{tr("Density: Inherit global")}</option>
          <option value="compact">{tr("Compact (compact)")}</option>
          <option value="comfortable">{tr("Comfortable (comfortable)")}</option>
        </select>
      </div>
      <AutoTabs
        mode={mode}
        size={size}
        density={density}
        items={[
          {
            id: "basic",
            label: tr("Basic"),
            content: (
              <AutoTabs
                mode={mode}
                size={size}
                density={density}
                extra={
                  <span className="auto-badge">
                    {tr("Keep mounted / persistent state")}
                  </span>
                }
                items={[
                  {
                    id: "overview",
                    label: tr("Overview"),
                    content: (
                      <div className="tab-demo-content">
                        <h3>{tr("Project overview")}</h3>
                        <p>
                          {tr(
                            "Content you have entered is preserved when switching tabs.",
                          )}
                        </p>
                        <input
                          aria-label={tr("Tab draft")}
                          placeholder={tr("Type something here…")}
                        />
                      </div>
                    ),
                  },
                  {
                    id: "settings",
                    label: tr("Configuration"),
                    children: [
                      {
                        id: "general",
                        label: tr("General"),
                        content: <p>{tr("General configuration content")}</p>,
                      },
                      {
                        id: "access",
                        label: tr("Permissions"),
                        content: (
                          <p>{tr("Permissions configuration content")}</p>
                        ),
                      },
                    ],
                  },
                  {
                    id: "activity",
                    label: tr("Dynamic"),
                    badge: "NEW",
                    content: (
                      <div className="tab-demo-content">
                        <h3>{tr("Activity tracking and audit")}</h3>
                        <p className="auto-muted">
                          {tr(
                            "Demonstrates dynamic notification badges in micro-frontend and complex multi-tab panel scenarios.",
                          )}
                        </p>
                        <div className="auto-actions" style={{ marginTop: 12 }}>
                          <span className="auto-badge">
                            {tr("v0.1.0 stable build")}
                          </span>
                          <span className="auto-badge">
                            {tr("100% independent unit tests passed")}
                          </span>
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: "disabled",
                    label: tr("Archive"),
                    disabled: true,
                  },
                ]}
              />
            ),
          },
          {
            id: "dynamic",
            label: tr("Dynamic tabs"),
            content: (
              <DynamicTabsDemo mode={mode} size={size} density={density} />
            ),
          },
          {
            id: "access",
            label: tr("Access control"),
            content: (
              <TabsStateDemo mode={mode} size={size} density={density} />
            ),
          },
        ]}
      />
    </section>
  );
}
