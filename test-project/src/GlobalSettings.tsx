import { useDemoText, LanguagePicker } from "./i18n";
import type {
  AutoFormLayout,
  ComponentDensity,
  ComponentSize,
  TableDensity,
} from "@zeroman.yang/react-auto-components";
type StudioFormLayout = Required<
  Omit<AutoFormLayout, "classNames" | "styles">
>;
export interface StudioSettings {
  size: ComponentSize;
  density: ComponentDensity;
  tableDensity: TableDensity;
  tabsDensity: ComponentDensity;
  form: StudioFormLayout;
  /** Light/dark are the built-in default theme; presets add popular looks. */
  theme: "auto" | "light" | "dark" | "antd" | "github" | "material" | "bootstrap";
}
export const defaultStudioSettings: StudioSettings = {
  size: "medium",
  density: "compact",
  tableDensity: "compact",
  tabsDensity: "compact",
  form: {
    labelPosition: "left",
    labelAlign: "right",
    labelWidth: "auto",
    density: "compact",
    size: "medium",
  },
  theme: "auto",
};
export function GlobalSettings({
  value,
  onChange,
}: {
  value: StudioSettings;
  onChange: (value: StudioSettings) => void;
}) {
  const tr = useDemoText();
  const form = (patch: Partial<AutoFormLayout>) =>
    onChange({
      ...value,
      form: {
        ...value.form,
        ...patch,
      },
    });
  return (
    <div className="global-settings">
      <LanguagePicker variant="block" />
      <p className="auto-muted">
        {tr(
          "Settings apply immediately to all components; the current example continues after you close the panel.",
        )}
      </p>
      <label>
        {tr("Global size")}
        <select
          aria-label={tr("Global Component Size")}
          value={value.size}
          onChange={(e) => {
            const s = e.target.value as ComponentSize;
            onChange({
              ...value,
              size: s,
              form: {
                ...value.form,
                size: s,
              },
            });
          }}
        >
          <option value="large">{tr("Large (large)")}</option>
          <option value="medium">{tr("Medium (medium)")}</option>
          <option value="small">{tr("Small (small)")}</option>
        </select>
      </label>
      <label>
        {tr("Table density")}
        <select
          aria-label={tr("Global Table Density")}
          value={value.tableDensity}
          onChange={(e) =>
            onChange({
              ...value,
              tableDensity: e.target.value as TableDensity,
            })
          }
        >
          <option value="compact">{tr("Compact (compact)")}</option>
          <option value="normal">{tr("Normal (normal)")}</option>
          <option value="comfortable">{tr("Comfortable (comfortable)")}</option>
        </select>
      </label>
      <label>
        {tr("Tab density")}
        <select
          aria-label={tr("Global Tabs Density")}
          value={value.tabsDensity}
          onChange={(e) =>
            onChange({
              ...value,
              tabsDensity: e.target.value as ComponentDensity,
            })
          }
        >
          <option value="compact">{tr("Compact (compact)")}</option>
          <option value="comfortable">{tr("Comfortable (comfortable)")}</option>
        </select>
      </label>
      <label>
        {tr("Form layout")}
        <select
          aria-label={tr("Global form layout")}
          value={value.form.labelPosition === "left" ? "inline" : "stacked"}
          onChange={(e) =>
            form({
              labelPosition: e.target.value === "inline" ? "left" : "top",
            })
          }
        >
          <option value="stacked">{tr("Labels stacked vertically")}</option>
          <option value="inline">{tr("Labels on the left (same row)")}</option>
        </select>
      </label>
      <label>
        {tr("Label Text Alignment")}
        <select
          aria-label={tr("Global label alignment")}
          value={value.form.labelAlign}
          onChange={(e) =>
            form({
              labelAlign: e.target.value as "left" | "right",
            })
          }
        >
          <option value="left">{tr("Left-aligned")}</option>
          <option value="right">{tr("Right-aligned")}</option>
        </select>
      </label>
      <label>
        {tr("Form density")}
        <select
          aria-label={tr("Global form density")}
          value={value.form.density}
          onChange={(e) =>
            form({
              density: e.target.value as "compact" | "comfortable",
            })
          }
        >
          <option value="comfortable">{tr("Comfortable")}</option>
          <option value="compact">{tr("Compact")}</option>
        </select>
      </label>
      <div className="global-settings-width">
        <span>{tr("Label Width")}</span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "4px 0",
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: "normal",
            }}
          >
            <input
              type="checkbox"
              aria-label={tr("Global label width auto-fit")}
              checked={value.form.labelWidth === "auto"}
              onChange={(e) =>
                form({
                  labelWidth: e.target.checked ? "auto" : 80,
                })
              }
            />
            {tr("Auto-fit (auto)")}
          </label>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <input
            aria-label={tr("Global label width")}
            type="range"
            min={64}
            max={160}
            step={8}
            disabled={value.form.labelWidth === "auto"}
            value={
              typeof value.form.labelWidth === "number"
                ? value.form.labelWidth
                : 80
            }
            onChange={(e) =>
              form({
                labelWidth: Number(e.target.value),
              })
            }
          />
          <output>
            {value.form.labelWidth === "auto"
              ? tr("Auto-fit")
              : `${value.form.labelWidth}px`}
          </output>
        </div>
      </div>
      <label>
        {tr("Theme")}
        <select
          aria-label={tr("Demo theme")}
          value={value.theme}
          onChange={(e) =>
            onChange({
              ...value,
              theme: e.target.value as StudioSettings["theme"],
            })
          }
        >
          <option value="auto">{tr("Auto (follow system)")}</option>
          <option value="light">{tr("Light (default)")}</option>
          <option value="dark">{tr("Dark (default)")}</option>
          <option value="antd">{tr("Ant Design style")}</option>
          <option value="github">{tr("GitHub style")}</option>
          <option value="material">{tr("Material style")}</option>
          <option value="bootstrap">{tr("Bootstrap style")}</option>
        </select>
      </label>
      <div
        style={{
          marginTop: 8,
          paddingTop: 14,
          borderTop: "1px solid var(--auto-border)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          {tr("Quick presets")}
        </div>
        <div className="auto-actions">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                size: "medium",
                density: "compact",
                tableDensity: "compact",
                tabsDensity: "compact",
                form: {
                  labelPosition: "left",
                  labelAlign: "right",
                  labelWidth: "auto",
                  density: "compact",
                  size: "medium",
                },
              })
            }
          >
            {tr("Standard compact, same row")}
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                size: "medium",
                density: "comfortable",
                tableDensity: "comfortable",
                tabsDensity: "comfortable",
                form: {
                  labelPosition: "top",
                  labelAlign: "left",
                  labelWidth: "auto",
                  density: "comfortable",
                  size: "medium",
                },
              })
            }
          >
            {tr("Comfortable, stacked")}
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                size: "small",
                density: "compact",
                tableDensity: "compact",
                tabsDensity: "compact",
                form: {
                  labelPosition: "left",
                  labelAlign: "right",
                  labelWidth: "auto",
                  density: "compact",
                  size: "small",
                },
              })
            }
          >
            {tr("Small minimal compact")}
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                size: "large",
                density: "comfortable",
                tableDensity: "comfortable",
                tabsDensity: "comfortable",
                form: {
                  labelPosition: "top",
                  labelAlign: "left",
                  labelWidth: "auto",
                  density: "comfortable",
                  size: "large",
                },
              })
            }
          >
            {tr("Large size with spacious display")}
          </button>
        </div>
      </div>
    </div>
  );
}
