import { useState } from "react";
import {
  AutoTabs,
  type ComponentDensity,
  type ComponentSize,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";

const TAB_COUNT = 22;

export function TabsOverflowDemo({
  mode,
  size,
  density,
}: {
  mode: "horizontal" | "vertical";
  size?: ComponentSize;
  density?: ComponentDensity;
}) {
  const tr = useDemoText();
  const [value, setValue] = useState<readonly string[]>([
    `project-${Math.ceil(TAB_COUNT / 2)}`,
  ]);
  const items = Array.from({ length: TAB_COUNT }, (_, index) => {
    const label = tr("Project {0}", [String(index + 1).padStart(2, "0")]);
    return {
      id: `project-${index + 1}`,
      label,
      content: (
        <div className="tab-demo-content">
          <h3>{label}</h3>
          <p>{tr("Panels keep their state while the tab row scrolls.")}</p>
        </div>
      ),
    };
  });
  return (
    <div>
      <p className="auto-muted">
        {tr(
          "When tabs exceed the row width, scroll buttons appear on both edges and the active tab scrolls into view.",
        )}
      </p>
      {mode === "vertical" && (
        <p className="auto-badge">
          {tr("Overflow scrolling is horizontal-only — switch the mode above.")}
        </p>
      )}
      <AutoTabs
        mode={mode}
        size={size}
        density={density}
        items={items}
        value={value}
        onChange={(next) => setValue(next)}
        actions={
          <>
            <button
              type="button"
              disabled={value[0] === "project-1"}
              onClick={() => setValue(["project-1"])}
            >
              {tr("First tab")}
            </button>
            <button
              type="button"
              disabled={value[0] === `project-${TAB_COUNT}`}
              onClick={() => setValue([`project-${TAB_COUNT}`])}
            >
              {tr("Last tab")}
            </button>
          </>
        }
      />
    </div>
  );
}
