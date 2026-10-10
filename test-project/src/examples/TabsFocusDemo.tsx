import { useState, useEffect } from "react";
import {
  AutoTabs,
  useAutoTabActive,
  type AutoTab,
  type ComponentDensity,
  type ComponentSize,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";

function ActiveSensor() {
  const tr = useDemoText();
  const isActive = useAutoTabActive();
  const [activations, setActivations] = useState(0);

  useEffect(() => {
    if (isActive) {
      setActivations((prev) => prev + 1);
    }
  }, [isActive]);

  return (
    <div className="tab-demo-content">
      <h3>{tr("Subcomponent active sensing")}</h3>
      <p className="auto-muted">
        {tr(
          "useAutoTabActive() informs child components whenever this tab becomes visible or hidden.",
        )}
      </p>
      <div className="auto-actions" style={{ marginTop: 12 }}>
        <span
          className="auto-badge"
          style={{
            background: isActive
              ? "var(--auto-color-primary, #2563eb)"
              : "var(--auto-border-color, #94a3b8)",
            color: "#fff",
          }}
        >
          {isActive ? tr("Currently Active") : tr("Currently Hidden")}
        </span>
        <span className="auto-badge">
          {tr("Visit count: {0}", [activations])}
        </span>
      </div>
    </div>
  );
}

export function TabsFocusDemo({
  mode,
  size,
  density,
}: {
  mode: "horizontal" | "vertical";
  size?: ComponentSize;
  density?: ComponentDensity;
}) {
  const tr = useDemoText();
  const [restoreFocus, setRestoreFocus] = useState(true);
  const [autoFocusMode, setAutoFocusMode] = useState<
    "pointer-only" | "always" | "none"
  >("pointer-only");

  const items: AutoTab[] = [
    {
      id: "restore",
      label: tr("Focus memory & return"),
      content: (
        <div className="tab-demo-content">
          <h3>{tr("Focus restoration on return")}</h3>
          <p className="auto-muted">
            {tr(
              "Type in the middle input, switch to another tab, and switch back. The cursor returns precisely to where you were typing.",
            )}
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxWidth: 360,
              marginTop: 12,
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>{tr("Username")}</span>
              <input
                aria-label={tr("Username")}
                placeholder={tr("e.g. alice")}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>{tr("Email (try focusing here before switching)")}</span>
              <input
                aria-label={tr("Email")}
                placeholder={tr("e.g. alice@example.com")}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>{tr("Notes")}</span>
              <textarea
                aria-label={tr("Notes")}
                rows={2}
                placeholder={tr("Add notes here…")}
              />
            </label>
          </div>
        </div>
      ),
    },
    {
      id: "autofocus",
      label: tr("data-autofocus"),
      content: (
        <div className="tab-demo-content">
          <h3>{tr("Declarative autofocus target")}</h3>
          <p className="auto-muted">
            {tr(
              "Any element marked with data-autofocus receives focus automatically when entering this tab, even without component configuration.",
            )}
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxWidth: 360,
              marginTop: 12,
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>{tr("Initial read-only note")}</span>
              <input readOnly value={tr("Skipped during autofocus")} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>{tr("Quick search (marked with data-autofocus)")}</span>
              <input
                data-autofocus
                aria-label={tr("Autofocused search")}
                placeholder={tr(
                  "I gain focus immediately upon switching here!",
                )}
              />
            </label>
          </div>
        </div>
      ),
    },
    {
      id: "selector",
      label: tr("Custom focusTarget"),
      focusTarget: "#custom-editor-target",
      content: (
        <div className="tab-demo-content">
          <h3>{tr("Targeted by focusTarget selector")}</h3>
          <p className="auto-muted">
            {tr(
              "Configured with focusTarget: '#custom-editor-target'. Focus skips the preceding toolbar button and jumps straight into the editor.",
            )}
          </p>
          <div style={{ marginTop: 12 }}>
            <div className="auto-actions" style={{ marginBottom: 8 }}>
              <button type="button">{tr("Toolbar button (skipped)")}</button>
            </div>
            <textarea
              id="custom-editor-target"
              aria-label={tr("Custom editor")}
              rows={4}
              style={{ width: "100%", maxWidth: 420 }}
              placeholder={tr("Editor field targeted by CSS selector…")}
            />
          </div>
        </div>
      ),
    },
    {
      id: "sensing",
      label: tr("useAutoTabActive"),
      content: <ActiveSensor />,
    },
  ];

  return (
    <div>
      <div className="auto-actions" style={{ marginBottom: 12 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
          }}
        >
          <input
            type="checkbox"
            checked={restoreFocus}
            onChange={(e) => setRestoreFocus(e.target.checked)}
          />
          <span>{tr("Enable focus restoration (restoreFocus)")}</span>
        </label>
        <select
          aria-label={tr("Auto focus mode")}
          value={autoFocusMode}
          onChange={(e) =>
            setAutoFocusMode(e.target.value as typeof autoFocusMode)
          }
        >
          <option value="pointer-only">
            {tr("pointer-only (arrow keys keep trigger focus)")}
          </option>
          <option value="always">
            {tr("always (all switches transfer focus)")}
          </option>
          <option value="none">{tr("none (never autofocus)")}</option>
        </select>
      </div>
      <AutoTabs
        mode={mode}
        size={size}
        density={density}
        restoreFocus={restoreFocus}
        autoFocusMode={autoFocusMode}
        items={items}
      />
    </div>
  );
}
