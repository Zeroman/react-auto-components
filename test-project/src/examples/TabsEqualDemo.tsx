import { useState } from "react";
import {
  AutoTabs,
  type ComponentDensity,
  type ComponentSize,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";

export function TabsEqualDemo({
  size,
  density,
}: {
  size?: ComponentSize;
  density?: ComponentDensity;
}) {
  const tr = useDemoText();
  const [equal, setEqual] = useState(true);
  const panel = (
    <div className="tab-demo-content">
      <p className="auto-muted">
        {tr("Switching tabs keeps every panel mounted.")}
      </p>
    </div>
  );
  return (
    <div className="equal-tabs-demo">
      <div className="auto-actions">
        <label>
          <input
            type="checkbox"
            checked={equal}
            onChange={(event) => setEqual(event.target.checked)}
          />
          {tr("Equal width")}
        </label>
      </div>
      <div style={{ maxWidth: 360, margin: "0 auto" }}>
        <AutoTabs
          tabLayout={equal ? "equal" : "scroll"}
          size={size}
          density={density}
          headerExtra={
            <button
              type="button"
              className="auto-tool-btn"
              aria-label={tr("Back")}
              title={tr("Back")}
              onClick={() => {}}
            >
              <span className="auto-icon" aria-hidden="true">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5" />
                  <path d="m12 19-7-7 7-7" />
                </svg>
              </span>
            </button>
          }
          actions={
            <button
              type="button"
              className="auto-tool-btn"
              aria-label={tr("More")}
              title={tr("More")}
              onClick={() => {}}
            >
              <span className="auto-icon" aria-hidden="true">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </span>
            </button>
          }
          items={[
            { id: "home", label: tr("Home"), content: panel },
            { id: "orders", label: tr("Orders"), content: panel },
            {
              id: "reports",
              label: tr("Performance reports and insights"),
              content: panel,
            },
            { id: "profile", label: tr("Profile"), content: panel },
          ]}
        />
      </div>
    </div>
  );
}
