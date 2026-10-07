import type { TipConfig } from "../../core/tip";
import { useAutoText } from "../../core/i18n";
import { Popover } from "../../internal/Popover";
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
  /**
   * How to display secondary fields marked with `search: { more: true }`.
   * `"inline"` (default): expands within the search grid.
   * `"popover"`: displays secondary fields in a floating popover attached to the More filters button.
   */
  moreLayout?: "inline" | "popover";
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
  moreLayout = "inline",
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
    [more, setMore] = useState(false),
    [popoverOpen, setPopoverOpen] = useState(false);
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
  const moreFields = fields.filter(isFieldMore);
  const hasMoreFields = moreFields.length > 0;
  const isPopoverMore = moreLayout === "popover" && hasMoreFields;

  const activeMoreCount = moreFields.filter((f) => {
    if (!f.name) return false;
    const v = (current as Record<string, unknown>)[f.name];
    return (
      v !== undefined &&
      v !== null &&
      v !== "" &&
      !(Array.isArray(v) && !v.length)
    );
  }).length;

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
          (isPopoverMore
            ? fields.filter((f) => !isFieldMore(f))
            : fields.map((f) => ({
                ...f,
                hidden: (v: Readonly<T>): boolean =>
                  Boolean(
                    resolve(f.hidden, v, false) || (isFieldMore(f) && !more),
                  ),
              }))) as Field<T>[]
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
          {hasMoreFields &&
            (isPopoverMore ? (
              <Popover
                placement="bottom-start"
                open={popoverOpen}
                onOpenChange={setPopoverOpen}
                content={
                  <div className="auto-search-popover-panel">
                    <div className="auto-search-popover-header">
                      <div className="auto-search-popover-title-row">
                        <span>{tr("More filters")}</span>
                        {activeMoreCount > 0 && (
                          <span className="auto-more-count">
                            {activeMoreCount}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="auto-search-popover-close"
                        onClick={() => setPopoverOpen(false)}
                        aria-label={tr("Close")}
                      >
                        ×
                      </button>
                    </div>
                    <div className="auto-search-popover-form">
                      <AutoForm
                        fields={moreFields}
                        value={current}
                        onChange={change}
                        columns={1}
                        labelPosition="left"
                        density="compact"
                        size={size}
                        actions={false}
                        tipComponent={tipComponent}
                      />
                    </div>
                    <div className="auto-actions auto-search-popover-actions">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          const defs = defaults<T>(fields, defaultValue);
                          const resetDraft = { ...current };
                          for (const f of moreFields) {
                            if (f.name) {
                              if (f.name in (defs as Record<string, unknown>)) {
                                (resetDraft as Record<string, unknown>)[
                                  f.name
                                ] = (defs as Record<string, unknown>)[f.name];
                              } else {
                                delete (resetDraft as Record<string, unknown>)[
                                  f.name
                                ];
                              }
                            }
                          }
                          change(resetDraft);
                        }}
                      >
                        {resetLabel ?? tr("Reset")}
                      </button>
                      <button
                        type="button"
                        className="auto-primary"
                        disabled={disabled}
                        onClick={() => {
                          setPopoverOpen(false);
                          void send(current);
                        }}
                      >
                        {searchLabel ?? tr("Search")}
                      </button>
                    </div>
                  </div>
                }
              >
                <button
                  type="button"
                  className={[
                    classNames?.moreButton,
                    "auto-search-more-popover-btn",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={styles?.moreButton}
                  data-testid="rac-more-filters"
                  aria-expanded={popoverOpen}
                >
                  <span>{tr("More filters")}</span>
                  {activeMoreCount > 0 && (
                    <span className="auto-more-count">{activeMoreCount}</span>
                  )}
                  <span className="auto-caret" aria-hidden="true">
                    ▾
                  </span>
                </button>
              </Popover>
            ) : (
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
            ))}
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
