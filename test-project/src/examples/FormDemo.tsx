import { useRef, useState } from "react";
import {
  AutoForm,
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
      label: tr("内部编号"),
      hidden: (v) => !v.active,
      placeholder: tr("启用时显示"),
    },
  ];
  return (
    <div
      style={{
        display: "grid",
        gap: 24,
      }}
    >
      <div className="demo-grid">
        <section className="card">
          <h2>{tr("创建一个项目")}</h2>
          <p className="muted">{tr("必填校验、字段联动和异步提交。")}</p>
          <div className="auto-root">
            <label>
              <input
                type="checkbox"
                checked={fail}
                onChange={(e) => setFail(e.target.checked)}
              />
              {tr("模拟提交失败")}
            </label>
          </div>
          <div
            className="auto-root auto-actions"
            style={{
              margin: "12px 0",
            }}
          >
            <label>
              {tr("标签位置")}{" "}
              <select
                aria-label={tr("表单标签位置")}
                value={labelPosition}
                onChange={(e) =>
                  setLabelPosition(e.target.value as "inherit" | "top" | "left")
                }
              >
                <option value="inherit">{tr("跟随全局")}</option>
                <option value="top">{tr("上方")}</option>
                <option value="left">{tr("左侧")}</option>
              </select>
            </label>
            <label>
              {tr("标签文字对齐")}{" "}
              <select
                aria-label={tr("表单标签对齐")}
                value={labelAlign}
                onChange={(e) =>
                  setLabelAlign(e.target.value as "inherit" | "left" | "right")
                }
              >
                <option value="inherit">{tr("跟随全局")}</option>
                <option value="left">{tr("左对齐")}</option>
                <option value="right">{tr("右对齐")}</option>
              </select>
            </label>
            <label>
              {tr("标签宽度")}{" "}
              <select
                aria-label={tr("表单标签宽度")}
                value={labelWidth}
                onChange={(e) =>
                  setLabelWidth(
                    e.target.value as "inherit" | "auto" | "80" | "120",
                  )
                }
              >
                <option value="inherit">{tr("跟随全局")}</option>
                <option value="auto">{tr("自适应 (auto)")}</option>
                <option value="80">{tr("固定 80px")}</option>
                <option value="120">{tr("固定 120px")}</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={compact ?? services.form.density === "compact"}
                onChange={(e) => setCompact(e.target.checked)}
              />
              {tr("紧凑表单")}
            </label>
          </div>
          <AutoForm<Project>
            ref={formRef}
            labelAlign={labelAlign === "inherit" ? undefined : labelAlign}
            labelPosition={
              labelPosition === "inherit" ? undefined : labelPosition
            }
            labelWidth={
              labelWidth === "inherit"
                ? undefined
                : labelWidth === "auto"
                  ? "auto"
                  : Number(labelWidth)
            }
            density={
              compact === undefined
                ? undefined
                : compact
                  ? "compact"
                  : "comfortable"
            }
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
                {tr("填入测试数据")}
              </button>
            }
            onSubmit={async (value) => {
              if (fail)
                throw new Error(tr("模拟服务端拒绝，请关闭失败开关后重试"));
              setResult(JSON.stringify(value, null, 2));
            }}
          />
        </section>
        <section className="card code-card">
          <div className="code-title">
            {tr("提交结果")}
            <span>JSON</span>
          </div>
          <pre data-testid="form-result">
            {result || tr("// 填写表单并提交\n// 数据将显示在这里")}
          </pre>
          <div className="code-note">
            {tr("字段类型通过数据模型约束，扩展字段通过 render 注入。")}
          </div>
        </section>
      </div>

      <section className="card auto-root">
        <div className="section-heading">
          <div>
            <h2>{tr("全组件类型画廊")}</h2>
            <p className="muted">
              {tr(
                "多级级联、自动补全、虚拟滚动大列表、日期范围及快捷键等丰富字段一览。",
              )}
            </p>
          </div>
        </div>
        <AutoForm<GalleryRecord>
          columns={2}
          labelPosition={
            labelPosition === "inherit" ? undefined : labelPosition
          }
          density={
            compact === undefined
              ? undefined
              : compact
                ? "compact"
                : "comfortable"
          }
          fields={galleryFields}
          submitLabel={tr("提交画廊数据")}
          onSubmit={async (value) => {
            setResult(JSON.stringify(value, null, 2));
          }}
        />
      </section>
    </div>
  );
}
