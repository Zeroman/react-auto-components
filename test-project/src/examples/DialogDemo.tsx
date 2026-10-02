import { useState } from "react";
import { useAutoDialog } from "@zeroman.yang/react-auto-components";
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
      <h2>{tr("Keep the editing workflow intact")}</h2>
      <p className="muted">
        {tr(
          "Canceling keeps the draft; it is cleared after a successful submission. Supports dragging and fullscreen.",
        )}
      </p>
      <div className="auto-actions">
        <button
          className="auto-primary"
          onClick={() =>
            dialog.open<Project>({
              title: tr("New Project"),
              fields,
              defaultValue: {
                name: "",
              },
              draftKey: "demo-project",
              draggable: true,
              showReset: true,
              onSubmit: (value) => setResult(tr("Saved: {0}", [value.name])),
            })
          }
        >
          {tr("Open form dialog")}
        </button>
        <button
          onClick={() =>
            dialog.open({
              title: tr("Close interception example"),
              content: (
                <p>{tr("Canceling is intercepted; click OK to close.")}</p>
              ),
              beforeClose: (reason) => reason === "submit",
            })
          }
        >
          {tr("Test close interception")}
        </button>
        <button
          onClick={() =>
            dialog.open({
              title: tr("First level"),
              content: (
                <button
                  onClick={() =>
                    dialog.open({
                      title: tr("Second level"),
                      content: (
                        <p>{tr("Nested dialogs restore focus correctly.")}</p>
                      ),
                    })
                  }
                >
                  {tr("Open second level")}
                </button>
              ),
            })
          }
        >
          {tr("Nested dialog")}
        </button>
        <button
          onClick={() =>
            dialog.open({
              title: tr("High-Risk Archive Operation Confirmation"),
              content: (
                <div>
                  <p
                    style={{
                      color: "var(--auto-danger)",
                      fontWeight: 600,
                      margin: "0 0 8px",
                    }}
                  >
                    {tr(
                      "Warning: This operation will permanently freeze all resources and subtasks of this business unit!",
                    )}
                  </p>
                  <p
                    className="auto-muted"
                    style={{
                      margin: 0,
                      fontSize: 13,
                    }}
                  >
                    {tr(
                      "The system will save an audit log. Please verify permissions before proceeding.",
                    )}
                  </p>
                </div>
              ),
              confirmLabel: tr("Confirm Archive"),
              cancelLabel: tr("Abort"),
              onSubmit: () =>
                setResult(tr("High-risk archive operation confirmed")),
            })
          }
        >
          {tr("High-risk confirmation dialog")}
        </button>
        <button
          onClick={() =>
            dialog.open({
              title: tr("Fullscreen Data Display Workspace"),
              fullscreen: true,
              content: (
                <div
                  style={{
                    padding: 12,
                  }}
                >
                  <h3>{tr("Fullscreen Mode Workspace")}</h3>
                  <p className="auto-muted">
                    {tr(
                      "Supports complex business flows, chart analysis, and multi-level tables. Press Esc or close at the top right to return.",
                    )}
                  </p>
                  <div
                    className="metrics"
                    style={{
                      margin: "20px 0",
                    }}
                  >
                    <Metric
                      label={tr("Node health")}
                      value="100"
                      unit="%"
                      detail={tr("All clusters normal")}
                    />
                    <Metric
                      label={tr("Concurrent processing")}
                      value="1,240"
                      unit="qps"
                      detail={tr("Avg response 18ms")}
                    />
                    <Metric
                      label={tr("Memory overhead")}
                      value="14"
                      unit="MB"
                      detail={tr("Optimized with TanStack virtualization")}
                    />
                  </div>
                </div>
              ),
            })
          }
        >
          {tr("Fullscreen mode dialog")}
        </button>
        <button
          onClick={() => {
            localStorage.removeItem("auto-studio:draft:demo-project");
            setResult(tr("New project draft has been reset"));
          }}
        >
          {tr("Reset dialog draft")}
        </button>
      </div>
      <p role="status">{result}</p>
    </section>
  );
}
