import { useState } from "react";
import {
  AutoFocus,
  AutoTabs,
  type ComponentDensity,
  type ComponentSize,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";

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
  const [enabled, setEnabled] = useState(true);
  const [showLast, setShowLast] = useState(true);
  const fieldStyle = { display: "grid", gap: 8, maxWidth: 420, marginTop: 12 };
  return (
    <div>
      <p>
        {tr(
          "AutoFocus works anywhere. The last registered visible entry wins; tabs only control which content is shown.",
        )}
      </p>
      <label className="auto-actions" style={{ marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        {tr("Enable AutoFocus")}
      </label>
      <AutoTabs
        mode={mode}
        size={size}
        density={density}
        items={[
          {
            id: "entry",
            label: tr("Default entry"),
            content: (
              <div className="tab-demo-content">
                <p>
                  {tr(
                    "Edit the second field, switch tabs, then return. Focus enters Username again while your draft is retained.",
                  )}
                </p>
                <AutoFocus disabled={!enabled}>
                  <div style={fieldStyle}>
                    <label>
                      {tr("Username")}
                      <input aria-label={tr("Username")} />
                    </label>
                    <label>
                      {tr("Email")}
                      <input aria-label={tr("Email")} />
                    </label>
                  </div>
                </AutoFocus>
              </div>
            ),
          },
          {
            id: "selector",
            label: tr("Selected entry"),
            content: (
              <div className="tab-demo-content">
                <p>
                  {tr(
                    "AutoFocus selects the editor and skips the toolbar. Mouse, keyboard and programmatic tab switches behave alike.",
                  )}
                </p>
                <AutoFocus disabled={!enabled} target="textarea">
                  <div style={fieldStyle}>
                    <button type="button">
                      {tr("Toolbar button (skipped)")}
                    </button>
                    <textarea aria-label={tr("Custom editor")} rows={4} />
                  </div>
                </AutoFocus>
              </div>
            ),
          },
          {
            id: "multiple",
            label: tr("Multiple entries"),
            content: (
              <div className="tab-demo-content">
                <p>
                  {tr(
                    "The later entry wins while visible. Hide it to activate the earlier entry; no conflict configuration is needed.",
                  )}
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={showLast}
                    onChange={(event) => setShowLast(event.target.checked)}
                  />
                  {tr("Show later entry")}
                </label>
                <div style={fieldStyle}>
                  <AutoFocus disabled={!enabled}>
                    <input
                      aria-label={tr("Earlier entry")}
                      placeholder={tr("Earlier entry")}
                    />
                  </AutoFocus>
                  <div hidden={!showLast}>
                    <AutoFocus disabled={!enabled}>
                      <input
                        aria-label={tr("Later entry")}
                        placeholder={tr("Later entry")}
                      />
                    </AutoFocus>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "nested",
            label: tr("Nested entry"),
            children: [
              {
                id: "editor",
                label: tr("Editor"),
                content: (
                  <AutoFocus disabled={!enabled}>
                    <textarea aria-label={tr("Nested editor")} rows={4} />
                  </AutoFocus>
                ),
              },
              {
                id: "other",
                label: tr("Other entry"),
                content: (
                  <AutoFocus disabled={!enabled}>
                    <input aria-label={tr("Other entry")} />
                  </AutoFocus>
                ),
              },
            ],
          },
        ]}
      />
    </div>
  );
}
