import type { TipConfig } from "../../core/tip";
import { useAutoText } from "../../core/i18n";
import {
  useEffect,
  useState,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AutoForm, type AutoFormHandle } from "../AutoForm";
import { defaults, equal, errorMessage, resolve } from "../../core/config";
import { buildQuery, type QueryNode } from "../../core/query";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { useLibraryStyles } from "../../core/dev";
import type {
  Field,
  AutoFormLayout,
  AutoFormClassNames,
  AutoFormStyles,
} from "../../core/types";

/**
 * CSS class name slots for AutoSearch components.
 */
export interface AutoSearchClassNames extends AutoFormClassNames {
  panel?: string;
  searchButton?: string;
  resetButton?: string;
  moreButton?: string;
}

/**
 * CSS style slots for AutoSearch components.
 */
export interface AutoSearchStyles extends AutoFormStyles {
  panel?: CSSProperties;
  searchButton?: CSSProperties;
  resetButton?: CSSProperties;
  moreButton?: CSSProperties;
}

/**
 * Search form that emits a {@link QueryNode} plus the raw values.
 * `mode` defaults to `"instant"` (search on every change). `"manual"` searches on submit.
 * `columns` defaults to `3`.
 * All searches catch thrown/rejected errors and keep the current draft. Only the latest search may display an error.
 * Instant edits and submit validate fields. Reset clears errors and searches defaults without validation.
 * Hidden and inaccessible fields are omitted from the query; the values argument stays raw.
 * Empty values are omitted. `match: "isNull"` is the exception and matches null.
 * `match: "between"` requires a two-item value. See docs/auto-search.md.
 */
export interface AutoSearchProps<T extends object>
  extends AutoFormLayout, TipConfig {
  fields: readonly Field<T>[];
  value?: T;
  defaultValue?: Partial<T>;
  /** Fires when the draft changes, including reset. */
  onChange?: (values: T) => void;
  /**
   * Required. Receives the built query and the values.
   * Reject or throw to keep the draft and show `error.message`.
   * Returned promises are awaited; return values are ignored.
   */
  onSearch: (query: QueryNode, values: T) => void;
  /** Default `"instant"`. `"manual"` searches only on submit or reset. */
  mode?: "manual" | "instant";
  /** Default `3`. */
  columns?: number;
  disabled?: boolean;
  searchLabel?: string;
  resetLabel?: string;
  extraActions?: ReactNode;
  sortTags?: readonly {
    id: string;
    label: string;
    onRemove: () => void;
  }[];
  classNames?: AutoSearchClassNames;
  styles?: AutoSearchStyles;
}
export function AutoSearch<T extends object>({
  fields,
  tipComponent,
  value,
  defaultValue,
  onChange,
  onSearch,
  mode = "instant",
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
  classNames,
  styles,
}: AutoSearchProps<T>) {
  const tr = useAutoText();
  const services = useAutoConfig();
  useLibraryStyles();
  const density =
    ownDensity ?? services.form.density ?? services.density ?? "comfortable";
  const size = ownSize ?? services.form.size ?? services.size ?? "medium";
  const effectiveLabelWidth = labelWidth ?? services.form.labelWidth ?? "auto";
  const isAutoLabelWidth = effectiveLabelWidth === "auto";
  const [local, setLocal] = useState(() => defaults<T>(fields, defaultValue)),
    [more, setMore] = useState(false);
  const current = value ?? local;
  const ref = useRef<AutoFormHandle<T>>(null);
  const [searchError, setSearchError] = useState("");
  const request = useRef(0);
  const mounted = useRef(true);
  const resetting = useRef(false);
  const latestValues = useRef(current);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current++;
    };
  }, []);
  useEffect(() => {
    if (value !== undefined && !equal(value, latestValues.current)) {
      latestValues.current = value;
      request.current++;
      setSearchError("");
    }
  }, [value]);
  const send = async (v: T, validate = false) => {
    const ticket = ++request.current;
    setSearchError("");
    try {
      if (disabled || (validate && !(await ref.current?.validate()))) return;
      if (!mounted.current || ticket !== request.current) return;
      await onSearch(
        buildQuery(
          v,
          fields.filter(
            (f) => !resolve(f.hidden, v, false) && services.canAccess(f),
          ),
        ),
        v,
      );
    } catch (error) {
      if (mounted.current && ticket === request.current)
        setSearchError(errorMessage(error));
    }
  };
  const change = (v: T) => {
    latestValues.current = v;
    request.current++;
    setSearchError("");
    setLocal(v);
    onChange?.(v);
    if (mode === "instant" && !resetting.current) void send(v, true);
  };
  const isFieldMore = (f: Field<T>): boolean =>
    "search" in f && !!f.search?.more;

  return (
    <section
      className={["auto-root auto-search", classNames?.panel]
        .filter(Boolean)
        .join(" ")}
      data-testid="rac-search-panel"
      data-density={density}
      data-size={size}
      data-label-width={
        isAutoLabelWidth
          ? "auto"
          : typeof effectiveLabelWidth === "number"
            ? `${effectiveLabelWidth}px`
            : effectiveLabelWidth
      }
      style={styles?.panel}
    >
      <AutoForm
        tipComponent={tipComponent}
        ref={ref}
        classNames={classNames}
        styles={styles}
        fields={
          fields.map((f) => ({
            ...f,
            hidden: (v: Readonly<T>): boolean =>
              Boolean(resolve(f.hidden, v, false) || (isFieldMore(f) && !more)),
          })) as Field<T>[]
        }
        value={current}
        onChange={change}
        onSubmit={(v) => send(v)}
        columns={columns}
        labelPosition={labelPosition}
        labelAlign={labelAlign}
        labelWidth={effectiveLabelWidth}
        density={density}
        size={size}
        disabled={disabled}
        actions={false}
      >
        <div
          className={["auto-actions auto-form-actions", classNames?.actions]
            .filter(Boolean)
            .join(" ")}
          style={styles?.actions}
        >
          <button
            type="submit"
            className={[
              "auto-primary",
              classNames?.searchButton,
              classNames?.submit,
            ]
              .filter(Boolean)
              .join(" ")}
            data-testid="rac-search"
            disabled={disabled}
            style={{ ...styles?.submit, ...styles?.searchButton }}
          >
            {searchLabel ?? tr("Search")}
          </button>
          <button
            type="button"
            className={[classNames?.resetButton, classNames?.reset]
              .filter(Boolean)
              .join(" ")}
            data-testid="rac-search-reset"
            disabled={disabled}
            style={{ ...styles?.reset, ...styles?.resetButton }}
            onClick={() => {
              const v = defaults<T>(fields, defaultValue);
              resetting.current = true;
              try {
                ref.current?.reset(v);
              } finally {
                resetting.current = false;
              }
              void send(v);
            }}
          >
            {resetLabel ?? tr("Reset")}
          </button>
          {extraActions}
          {fields.some(isFieldMore) && (
            <button
              type="button"
              className={classNames?.moreButton}
              style={styles?.moreButton}
              data-testid="rac-more-filters"
              aria-expanded={more}
              onClick={() => setMore(!more)}
            >
              {more ? tr("Hide filters") : tr("More filters")}
            </button>
          )}
          {sortTags?.map((t) => (
            <button key={t.id} type="button" onClick={t.onRemove}>
              {t.label} ×
            </button>
          ))}
        </div>
        {searchError && (
          <p role="alert" className="auto-error">
            {searchError}
          </p>
        )}
      </AutoForm>
    </section>
  );
}
