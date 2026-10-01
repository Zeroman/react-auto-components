import { useAutoText } from "../../core/i18n";
import { useState, useRef } from "react";
import { AutoForm, type AutoFormHandle } from "../AutoForm";
import { defaults, resolve } from "../../core/config";
import { buildQuery, type QueryNode } from "../../core/query";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import type { Field, AutoFormLayout } from "../../core/types";
export interface AutoSearchPanelProps<T extends object> extends AutoFormLayout {
  fields: readonly Field<T>[];
  value?: T;
  defaultValue?: Partial<T>;
  onChange?: (values: T) => void;
  onSearch: (query: QueryNode, values: T) => void;
  mode?: "manual" | "instant";
  columns?: number;
  disabled?: boolean;
  searchLabel?: string;
  resetLabel?: string;
  extraActions?: React.ReactNode;
  sortTags?: readonly {
    id: string;
    label: string;
    onRemove: () => void;
  }[];
}
export function AutoSearchPanel<T extends object>({
  fields,
  value,
  defaultValue,
  onChange,
  onSearch,
  mode = "manual",
  columns = 3,
  labelPosition,
  labelAlign,
  labelWidth,
  density: ownDensity,
  size: ownSize,
  disabled,
  searchLabel,
  resetLabel,
  extraActions,
  sortTags,
}: AutoSearchPanelProps<T>) {
  const tr = useAutoText();
  const services = useAutoConfig();
  const density =
    ownDensity ?? services.form.density ?? services.density ?? "comfortable";
  const size = ownSize ?? services.form.size ?? services.size ?? "medium";
  const effectiveLabelWidth = labelWidth ?? services.form.labelWidth ?? "auto";
  const isAutoLabelWidth = effectiveLabelWidth === "auto";
  const [local, setLocal] = useState(() => defaults<T>(fields, defaultValue)),
    [more, setMore] = useState(false);
  const current = value ?? local;
  const ref = useRef<AutoFormHandle<T>>(null);
  const send = (v: T) =>
    onSearch(
      buildQuery(
        v,
        fields.filter((f) => !resolve(f.hidden, v, false)),
      ),
      v,
    );
  const change = (v: T) => {
    setLocal(v);
    onChange?.(v);
    if (mode === "instant") send(v);
  };
  return (
    <section
      className="auto-root auto-search"
      data-density={density}
      data-size={size}
      data-label-width={
        isAutoLabelWidth
          ? "auto"
          : typeof effectiveLabelWidth === "number"
            ? `${effectiveLabelWidth}px`
            : effectiveLabelWidth
      }
    >
      <AutoForm
        ref={ref}
        fields={
          fields.map((f) => ({
            ...f,
            hidden: (v: Readonly<T>) =>
              resolve(f.hidden, v, false) || (!!f.more && !more),
          })) as Field<T>[]
        }
        value={current}
        onChange={change}
        onSubmit={send}
        columns={columns}
        labelPosition={labelPosition}
        labelAlign={labelAlign}
        labelWidth={effectiveLabelWidth}
        density={density}
        size={size}
        disabled={disabled}
        actions={false}
      >
        <div className="auto-actions auto-form-actions">
          <button type="submit" className="auto-primary" disabled={disabled}>
            {searchLabel ?? tr("搜索")}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const v = defaults<T>(fields, defaultValue);
              setLocal(v);
              onChange?.(v);
              send(v);
            }}
          >
            {resetLabel ?? tr("重置")}
          </button>
          {extraActions}
          {fields.some((f) => f.more) && (
            <button
              type="button"
              aria-expanded={more}
              onClick={() => setMore(!more)}
            >
              {more ? tr("收起条件") : tr("更多条件")}
            </button>
          )}
          {sortTags?.map((t) => (
            <button key={t.id} type="button" onClick={t.onRemove}>
              {t.label} ×
            </button>
          ))}
        </div>
      </AutoForm>
    </section>
  );
}
