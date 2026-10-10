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
