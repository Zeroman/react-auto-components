import { useMemo, useState } from "react";
import {
  AutoForm,
  AutoSearch,
  matchesQuery,
  type Field,
  type QueryNode,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";
import "./RacLiveDemo.css";
import { RacDemoControls } from "./RacDemoControls";

type RacProject = {
  name: string;
  budget: number | undefined;
  enabled: boolean;
  code: string;
};

type Criteria = {
  name: string;
  status: "" | "active" | "paused";
};

const initialProject: RacProject = {
  name: "Atlas",
  budget: 1200,
  enabled: false,
  code: "",
};

const initialCriteria: Criteria = { name: "", status: "" };

const initialQuery: QueryNode = {
  kind: "group",
  operator: "and",
  children: [],
};

const projects: readonly { name: string; status: "active" | "paused" }[] = [
  { name: "Atlas", status: "active" },
  { name: "Atlas Mobile", status: "active" },
  { name: "Beacon", status: "paused" },
  { name: "Cedar", status: "paused" },
  { name: "Delta", status: "paused" },
  { name: "Ember", status: "paused" },
];

function criteriaFrom(value: Partial<Criteria> | undefined): Criteria {
  const status =
    value?.status === "active" || value?.status === "paused"
      ? value.status
      : "";
  return { name: value?.name ?? "", status };
}

function projectJson(value: RacProject) {
  return {
    name: value.name,
    budget: value.budget ?? null,
    enabled: value.enabled,
    code: value.code,
  };
}

export function RacFormLiveDemo() {
  const tr = useDemoText();
  const [value, setValue] = useState(initialProject);
  const [submitted, setSubmitted] = useState<RacProject | null>(null);
  const fields = useMemo<Field<RacProject>[]>(
    () => [
      { name: "name", label: tr("Project name") },
      {
        name: "budget",
        label: tr("Project budget"),
        type: "integer",
        min: 0,
      },
      { name: "enabled", label: tr("Enabled"), type: "switch" },
      {
        name: "code",
        label: tr("Internal code"),
        placeholder: tr("Shown only when enabled"),
        hidden: (current) => !current.enabled,
      },
    ],
    [tr],
  );
  return (
    <section className="rac-live">
      <RacDemoControls scenario="form" />
      <p className="muted">
        {tr(
          "Fill the project name, turn Enabled on, and the internal code field appears. Fill the code and the preview updates.",
        )}
      </p>
      <div className="rac-live-columns">
        <div className="card" data-testid="rac-form-fields">
          <h2>{tr("Controlled form")}</h2>
          <AutoForm<RacProject>
            fields={fields}
            value={value}
            defaultValue={initialProject}
            columns={1}
            resetLabel={tr("Reset")}
            onChange={(next) => setValue(next)}
            onReset={() => setSubmitted(null)}
            onSubmit={(next) => setSubmitted(next)}
          />
        </div>
        <article
          className="card rac-live-project"
          data-testid="rac-form-preview"
          data-enabled={value.enabled ? "true" : "false"}
          aria-live="polite"
        >
          <p>{tr("Live preview")}</p>
          <h3>{value.name || tr("Untitled project")}</h3>
          <dl>
            <div>
              <dt>{tr("Project name")}</dt>
              <dd>{value.name || tr("Untitled project")}</dd>
            </div>
            <div>
              <dt>{tr("Project budget")}</dt>
              <dd>{value.budget ?? tr("Empty budget")}</dd>
            </div>
            <div>
              <dt>{tr("Enabled")}</dt>
              <dd>
                <span
                  className="auto-badge"
                  data-testid="rac-form-status"
                  data-on={value.enabled ? "true" : "false"}
                >
                  {value.enabled ? tr("Enabled") : tr("Not enabled")}
                </span>
              </dd>
            </div>
            {value.enabled ? (
              <div>
                <dt>{tr("Internal code")}</dt>
                <dd>{value.code || tr("No code yet")}</dd>
              </div>
            ) : null}
          </dl>
        </article>
      </div>
      <div className="rac-live-columns">
        <div className="card">
          <h3>{tr("Current value")}</h3>
          <pre data-testid="rac-form-json">
            {JSON.stringify(projectJson(value), null, 2)}
          </pre>
        </div>
        <div className="card" data-testid="rac-form-submitted">
          <h3>{tr("Submitted value")}</h3>
          <pre>
            {submitted
              ? JSON.stringify(projectJson(submitted), null, 2)
              : tr("Nothing submitted yet.")}
          </pre>
        </div>
      </div>
    </section>
  );
}

export function RacSearchLiveDemo() {
  const tr = useDemoText();
  const [mode, setMode] = useState<"instant" | "manual">("instant");
  const [draft, setDraft] = useState(initialCriteria);
  const [appliedDraft, setAppliedDraft] = useState(initialCriteria);
  const [applied, setApplied] = useState<QueryNode>(initialQuery);
  const fields = useMemo<Field<Criteria>[]>(
    () => [
      {
        name: "name",
        label: tr("Project name"),
        placeholder: tr("Contains, ignores case"),
        search: { match: "contains", ignoreCase: true },
      },
      {
        name: "status",
        label: tr("Status"),
        type: "select",
        options: [
          { value: "", label: tr("RAC live all statuses") },
          { value: "active", label: tr("RAC live status active") },
          { value: "paused", label: tr("RAC live status paused") },
        ],
      },
    ],
    [tr],
  );
  const matches = projects.filter((row) => matchesQuery(row, applied));
  const pending =
    draft.name !== appliedDraft.name || draft.status !== appliedDraft.status;
  return (
    <section className="rac-live">
      <RacDemoControls scenario="search" />
      <p className="muted">
        {tr(
          "Instant applies every edit. Manual keeps the result list until Search. Switching mode keeps the draft and the last applied results. Reset shows all six projects.",
        )}
      </p>
      <div className="rac-live-columns">
        <div className="card" data-testid="rac-search-fields">
          <h2>{tr("Controlled search")}</h2>
          <label className="rac-live-mode auto-root">
            {tr("Search mode")}
            <select
              aria-label={tr("Search mode")}
              value={mode}
              onChange={(event) =>
                setMode(event.target.value === "manual" ? "manual" : "instant")
              }
            >
              <option value="instant">{tr("Instant")}</option>
              <option value="manual">{tr("Manual")}</option>
            </select>
          </label>
          {pending ? (
            <p className="rac-live-pending" role="status">
              {mode === "manual"
                ? tr(
                    "Draft changed. Results stay on the applied criteria until you click Search.",
                  )
                : tr(
                    "Applied results stay until the next edit in instant mode.",
                  )}
            </p>
          ) : null}
          <AutoSearch<Criteria>
            fields={fields}
            value={draft}
            defaultValue={initialCriteria}
            mode={mode}
            columns={1}
            searchLabel={tr("Search")}
            resetLabel={tr("Reset")}
            onChange={(next) => setDraft(criteriaFrom(next))}
            onSearch={(query, next) => {
              setApplied(query);
              setAppliedDraft(criteriaFrom(next));
            }}
          />
        </div>
        <div className="card">
          <h2>{tr("Results")}</h2>
          <p data-testid="rac-search-count" role="status">
            {tr("{0} projects", [matches.length])}
          </p>
          <div data-testid="rac-search-results">
            {matches.length === 0 ? (
              <p className="auto-empty">
                {tr("No projects match the applied criteria.")}
              </p>
            ) : (
              <ul className="rac-live-results">
                {matches.map((row) => (
                  <li key={row.name} className="rac-live-result">
                    <span>{row.name}</span>
                    <span className="auto-badge" data-status={row.status}>
                      {row.status === "active"
                        ? tr("RAC live status active")
                        : tr("RAC live status paused")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <div className="rac-live-columns">
        <div className="card">
          <h3>{tr("Criteria draft")}</h3>
          <pre data-testid="rac-search-draft">
            {JSON.stringify(draft, null, 2)}
          </pre>
        </div>
        <div className="card">
          <h3>{tr("Applied criteria")}</h3>
          <pre data-testid="rac-search-applied">
            {JSON.stringify(applied, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  );
}
