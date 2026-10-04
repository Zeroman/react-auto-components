import { useRef, useState } from "react";
import {
  AutoForm,
  AutoTabs,
  useAutoConfig,
  type AutoFormHandle,
  type Field,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";
import { useDemoData, type Project, type GalleryRecord } from "../data";

export function FormDemo() {
  const tr = useDemoText();
  const { fields, galleryFields } = useDemoData();
  const services = useAutoConfig();
  const formRef = useRef<AutoFormHandle<Project>>(null);
  const [labelPosition, setLabelPosition] = useState<
    "inherit" | "top" | "left"
  >("inherit");
  const [labelAlign, setLabelAlign] = useState<"inherit" | "left" | "right">(
    "inherit",
  );
  const [labelWidth, setLabelWidth] = useState<
    "inherit" | "auto" | "80" | "120"
  >("inherit");
  const [compact, setCompact] = useState<boolean | undefined>(undefined);
  const [result, setResult] = useState(""),
    [fail, setFail] = useState(false);
  const extra: Field<Project>[] = [
    ...fields,
    {
      name: "id",
      label: tr("Internal ID"),
      hidden: (v) => !v.active,
      placeholder: tr("Shown when enabled"),
      span: 2,
    },
  ];
  const layout = {
    labelAlign: labelAlign === "inherit" ? undefined : labelAlign,
    labelPosition: labelPosition === "inherit" ? undefined : labelPosition,
    labelWidth:
      labelWidth === "inherit"
        ? undefined
        : labelWidth === "auto"
          ? ("auto" as const)
          : Number(labelWidth),
    density:
      compact === undefined
        ? undefined
        : compact
          ? ("compact" as const)
          : ("comfortable" as const),
  };
  return (
    <div className="form-demo">
      <div className="auto-root auto-actions form-demo-layout">
        <label>
          {tr("Label Position")}{" "}
          <select
            aria-label={tr("Form label position")}
            value={labelPosition}
            onChange={(e) =>
              setLabelPosition(e.target.value as "inherit" | "top" | "left")
            }
          >
            <option value="inherit">{tr("Follow global")}</option>
            <option value="top">{tr("Top")}</option>
            <option value="left">{tr("Left")}</option>
          </select>
        </label>
        <label>
          {tr("Label Text Alignment")}{" "}
          <select
            aria-label={tr("Form label alignment")}
            value={labelAlign}
            onChange={(e) =>
              setLabelAlign(e.target.value as "inherit" | "left" | "right")
            }
          >
            <option value="inherit">{tr("Follow global")}</option>
            <option value="left">{tr("Left-aligned")}</option>
            <option value="right">{tr("Right-aligned")}</option>
          </select>
        </label>
        <label>
          {tr("Label Width")}{" "}
          <select
            aria-label={tr("Form label width")}
            value={labelWidth}
            onChange={(e) =>
              setLabelWidth(e.target.value as "inherit" | "auto" | "80" | "120")
            }
          >
            <option value="inherit">{tr("Follow global")}</option>
            <option value="auto">{tr("Auto-fit (auto)")}</option>
            <option value="80">{tr("Fixed 80px")}</option>
            <option value="120">{tr("Fixed 120px")}</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={compact ?? services.form.density === "compact"}
            onChange={(e) => setCompact(e.target.checked)}
          />
          {tr("Compact Form")}
        </label>
      </div>
      <div className="form-demo-tabs">
        <AutoTabs
          defaultValue={["project"]}
          lazy
          keepMounted
          items={[
            {
              id: "project",
              label: tr("Create a Project"),
              content: (
                <div className="demo-grid">
                  <section className="card">
                    <h2>{tr("Create a Project")}</h2>
                    <p className="muted">
                      {tr(
                        "Required-field validation, field linkage, and async submission.",
                      )}
                    </p>
                    <div className="auto-root">
                      <label>
                        <input
                          type="checkbox"
                          checked={fail}
                          onChange={(e) => setFail(e.target.checked)}
                        />
                        {tr("Simulate submission failure")}
                      </label>
                    </div>
                    <AutoForm<Project>
                      ref={formRef}
                      {...layout}
                      fields={extra}
                      extraActions={
                        <button
                          type="button"
                          onClick={() =>
                            formRef.current?.reset({
                              id: "999",
                              name: "Intelligent R&D Cloud Platform",
                              owner: "Chen Ruolin",
                              status: "In Progress",
                              budget: 48000,
                              progress: 72,
                              region: "Shanghai",
                              date: "2026-10-25",
                              active: true,
                            })
                          }
                        >
                          {tr("Fill with Test Data")}
                        </button>
                      }
                      onSubmit={async (value) => {
                        if (fail)
                          throw new Error(
                            tr(
                              "Simulated server rejection — please turn off the failure toggle and retry",
                            ),
                          );
                        setResult(JSON.stringify(value, null, 2));
                      }}
                    />
                  </section>
                  <section className="card code-card">
                    <div className="code-title">
                      {tr("Submission Result")}
                      <span>JSON</span>
                    </div>
                    <pre data-testid="form-result">
                      {result ||
                        tr(
                          "// Fill in the form and submit\n// Data will appear here",
                        )}
                    </pre>
                    <div className="code-note">
                      {tr(
                        "Field types are constrained by the data model; extension fields are injected via render.",
                      )}
                    </div>
                  </section>
                </div>
              ),
            },
            {
              id: "gallery",
              label: tr("Full Component Type Gallery"),
              content: (
                <section className="card auto-root">
                  <div className="section-heading">
                    <div>
                      <h2>{tr("Full Component Type Gallery")}</h2>
                      <p className="muted">
                        {tr(
                          "A rich overview of fields: multi-level cascades, autocomplete, large virtualized lists, date ranges, shortcuts, and more.",
                        )}
                      </p>
                    </div>
                  </div>
                  <AutoForm<GalleryRecord>
                    columns={2}
                    {...layout}
                    fields={galleryFields}
                    submitLabel={tr("Submit Gallery Data")}
                    onSubmit={async (value) => {
                      setResult(JSON.stringify(value, null, 2));
                    }}
                  />
                </section>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
