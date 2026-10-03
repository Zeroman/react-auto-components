import { useState } from "react";
import { AutoMenu } from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";
import "./mock/mock.css";

export function MenuDemo() {
  const tr = useDemoText();
  const [page, setPage] = useState("overview");
  const labels: Record<string, string> = {
    overview: tr("mock.overview"),
    active: tr("mock.active"),
    archive: tr("mock.archive"),
  };
  return (
    <section className="card auto-root mock-demo">
      <h2>{tr("mock.basicMenu")}</h2>
      <p className="muted">{tr("mock.basicMenuDescription")}</p>
      <div className="mock-split">
        <AutoMenu
          label={tr("mock.workspace")}
          value={page}
          onChange={setPage}
          items={[
            { id: "overview", label: labels.overview, icon: "◈" },
            {
              id: "projects",
              label: tr("mock.projects"),
              icon: "▤",
              children: [
                { id: "active", label: labels.active, badge: 8 },
                { id: "archive", label: labels.archive, badge: 3 },
              ],
            },
          ]}
        />
        <div className="mock-result" aria-live="polite">
          {tr("mock.selected", [labels[page]])}
        </div>
      </div>
    </section>
  );
}
