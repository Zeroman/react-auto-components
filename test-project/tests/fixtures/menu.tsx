import { useState } from "react";
import { createRoot } from "react-dom/client";
import { AutoConfigProvider, AutoMenu } from "@zeroman/react-auto-components";

function MenuFixture() {
  const [value, setValue] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  return (
    <AutoConfigProvider
      config={{
        t: (key, fallback) =>
          ({
            导航菜单: "Navigation",
            展开菜单: "Expand menu",
            收起菜单: "Collapse menu",
          })[key] ??
          fallback ??
          key,
      }}
    >
      <div
        data-testid="menu-fixture"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 20,
          display: "flex",
          gap: 24,
          padding: 16,
          background: "var(--auto-muted, #f6f8f6)",
          color: "var(--auto-text, #21352a)",
        }}
      >
        <div
          data-testid="menu-container"
          style={{
            width: collapsed ? 64 : 264,
            flexShrink: 0,
            minHeight: 0,
            padding: 8,
            background: "var(--auto-bg, white)",
            border: "1px solid var(--auto-border, #e0e7e2)",
            borderRadius: 12,
          }}
        >
          <AutoMenu
            label="Workspace"
            collapsible
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            value={value}
            onChange={setValue}
            header={
              <div style={{ fontWeight: 700, padding: 12 }}>
                {collapsed ? "A" : "AutoStudio"}
              </div>
            }
            footer={
              <small>{collapsed ? "v1" : "Workspace settings · v1"}</small>
            }
            items={[
              {
                id: "overview",
                label: "Overview",
                icon: "◈",
                description: "Activity and insights",
              },
              {
                id: "projects",
                label: "Projects",
                icon: "▤",
                badge: 12,
                children: [
                  { id: "active", label: "Active projects", badge: 8 },
                  {
                    id: "reports",
                    label: "Reports",
                    children: [
                      { id: "weekly", label: "Weekly overview" },
                      {
                        id: "annual",
                        label:
                          "Annual planning and international collaboration",
                        description: "A longer translated navigation label",
                      },
                    ],
                  },
                ],
              },
              {
                id: "disabled",
                label: "Unavailable",
                icon: "⊘",
                disabled: true,
              },
              { id: "iconless", label: "Bookmarks" },
              ...Array.from({ length: 18 }, (_, i) => ({
                id: `team-${i}`,
                label: `Team ${i + 1}`,
                icon: "▧",
              })),
            ]}
          />
        </div>
        <main style={{ minWidth: 0 }}>
          <h1>Menu preview</h1>
          <p data-testid="menu-selection">{value}</p>
        </main>
      </div>
    </AutoConfigProvider>
  );
}
const host = document.createElement("div");
document.body.append(host);
createRoot(host).render(<MenuFixture />);
