import { useDemoText, LanguagePicker } from "./i18n";
import type {
  AutoFormLayout,
  ComponentDensity,
  ComponentSize,
  TableDensity,
} from "@zeroman/react-auto-components";
export interface StudioSettings {
  size: ComponentSize;
  density: ComponentDensity;
  tableDensity: TableDensity;
  tabsDensity: ComponentDensity;
  form: Required<AutoFormLayout>;
  dark: boolean;
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
  dark: false,
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
        {tr("设置立即应用于所有组件，关闭面板后继续当前示例。")}
      </p>
      <label>
        {tr("全局尺寸")}
        <select
          aria-label={tr("全局组件尺寸")}
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
          <option value="large">{tr("大 (large)")}</option>
          <option value="medium">{tr("中 (medium)")}</option>
          <option value="small">{tr("小 (small)")}</option>
        </select>
      </label>
      <label>
        {tr("表格紧凑度")}
        <select
          aria-label={tr("全局表格紧凑度")}
          value={value.tableDensity}
          onChange={(e) =>
            onChange({
              ...value,
              tableDensity: e.target.value as TableDensity,
            })
          }
        >
          <option value="compact">{tr("紧凑 (compact)")}</option>
          <option value="normal">{tr("标准 (normal)")}</option>
          <option value="comfortable">{tr("舒适 (comfortable)")}</option>
        </select>
      </label>
      <label>
        {tr("标签紧凑度")}
        <select
          aria-label={tr("全局标签紧凑度")}
          value={value.tabsDensity}
          onChange={(e) =>
            onChange({
              ...value,
              tabsDensity: e.target.value as ComponentDensity,
            })
          }
        >
          <option value="compact">{tr("紧凑 (compact)")}</option>
          <option value="comfortable">{tr("舒适 (comfortable)")}</option>
        </select>
      </label>
      <label>
        {tr("表单布局")}
        <select
          aria-label={tr("全局表单布局")}
          value={value.form.labelPosition === "left" ? "inline" : "stacked"}
          onChange={(e) =>
            form({
              labelPosition: e.target.value === "inline" ? "left" : "top",
            })
          }
        >
          <option value="stacked">{tr("标签上下排列")}</option>
          <option value="inline">{tr("标签在左侧（同行）")}</option>
        </select>
      </label>
      <label>
        {tr("标签文字对齐")}
        <select
          aria-label={tr("全局标签对齐")}
          value={value.form.labelAlign}
          onChange={(e) =>
            form({
              labelAlign: e.target.value as "left" | "right",
            })
          }
        >
          <option value="left">{tr("左对齐")}</option>
          <option value="right">{tr("右对齐")}</option>
        </select>
      </label>
      <label>
        {tr("表单密度")}
        <select
          aria-label={tr("全局表单密度")}
          value={value.form.density}
          onChange={(e) =>
            form({
              density: e.target.value as "compact" | "comfortable",
            })
          }
        >
          <option value="comfortable">{tr("舒适")}</option>
          <option value="compact">{tr("紧凑")}</option>
        </select>
      </label>
      <div className="global-settings-width">
        <span>{tr("标签宽度")}</span>
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
              aria-label={tr("全局标签宽度自适应")}
              checked={value.form.labelWidth === "auto"}
              onChange={(e) =>
                form({
                  labelWidth: e.target.checked ? "auto" : 80,
                })
              }
            />
            {tr("自适应 (auto)")}
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
            aria-label={tr("全局标签宽度")}
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
              ? tr("自适应")
              : `${value.form.labelWidth}px`}
          </output>
        </div>
      </div>
      <label className="auto-actions">
        <input
          type="checkbox"
          checked={value.dark}
          onChange={(e) =>
            onChange({
              ...value,
              dark: e.target.checked,
            })
          }
        />
        {tr("深色主题")}
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
          {tr("快捷预设")}
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
            {tr("标准紧凑同行")}
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
            {tr("舒适上下堆叠")}
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
            {tr("小尺寸极简紧凑")}
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
            {tr("大尺寸宽适展示")}
          </button>
        </div>
      </div>
    </div>
  );
}
