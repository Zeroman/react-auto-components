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
import { AutoForm } from "../AutoForm";
import type { InternalAutoFormHandle } from "../AutoForm/internal";
import { defaults, equal, errorMessage, resolve } from "../../core/config";
import { buildQuery, type QueryNode } from "../../core/query";
import { validateFields } from "../../core/validation";
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
  const ref = useRef<InternalAutoFormHandle<T>>(null);
  const moreRef = useRef<InternalAutoFormHandle<T>>(null);
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
  const participates = (v: T) => (f: Field<T>) =>
    !resolve(f.hidden, v, false) &&
    services.canAccess(f) &&
    (isPopoverMore || !isFieldMore(f) || more);
  /**
   * Validate and search. `scope` limits extra validation to fields the caller
   * has not already validated ("more" after AutoForm validated the main
   * fields with inline errors). Validation always targets the outgoing values
   * `v`, covers more fields regardless of the popover's open state, and only
   * the latest call (highest ticket) may emit a query. Returns true when the
   * search ran.
   */
  const send = async (
    v: T,
    validate = false,
    scope: "all" | "more" = "all",
  ): Promise<boolean> => {
    const ticket = ++request.current;
    setSearchError("");
    try {
      if (disabled) return false;
      if (validate) {
        if (
          ref.current?.hasPendingUploads() ||
          moreRef.current?.hasPendingUploads()
        ) {
          setSearchError(tr("Wait for the upload to finish"));
          return false;
        }
        // The main form has already validated on submit. Otherwise validate
        // one shared outgoing snapshot, including edits in the other form.
        const targets = fields.filter(
          (f) =>
            participates(v)(f) &&
            (scope === "all" || (isPopoverMore && isFieldMore(f))),
        );
        const failures = await validateFields(targets, v, {
          tr,
          canAccess: (f) => services.canAccess(f as Field<T>),
        });
        if (!mounted.current || ticket !== request.current) return false;
        const mainFailures = Object.fromEntries(
          Object.entries(failures).filter(
            ([name]) =>
              !isPopoverMore || !moreFields.some((f) => f.name === name),
          ),
        );
        const moreFailures = Object.fromEntries(
          Object.entries(failures).filter(
            ([name]) =>
              isPopoverMore && moreFields.some((f) => f.name === name),
          ),
        );
        if (scope === "all") ref.current?.setValidationErrors(mainFailures);
        moreRef.current?.setValidationErrors(moreFailures);
        if (Object.keys(failures).length) {
          // Only unmounted fields need a summary; mounted forms show inline errors.
          if (!moreRef.current && Object.keys(moreFailures).length)
            setSearchError(Object.values(moreFailures).join("; "));
          return false;
        }
      }
      if (!mounted.current || ticket !== request.current) return false;
      await onSearch(buildQuery(v, fields.filter(participates(v))), v);
      return true;
    } catch (error) {
      if (mounted.current && ticket === request.current)
        setSearchError(errorMessage(error));
      return false;
    }
  };
  const change = (v: T) => {
    if (resetting.current) return;
    latestValues.current = v;
    request.current++;
    setSearchError("");
    setLocal(v);
    onChange?.(v);
    if (mode === "instant") void send(v, true);
  };
  const isFieldMore = (f: Field<T>): boolean =>
    "search" in f && !!f.search?.more;
  const moreFields = fields.filter(isFieldMore);
  const hasMoreFields = moreFields.length > 0;
  const isPopoverMore = moreLayout === "popover" && hasMoreFields;

  const activeMoreCount = moreFields.filter((f) => {
    if (!f.name) return false;
    const v = (current as Record<string, unknown>)[f.name];
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v)) {
      const between =
        "search" in f &&
        (f.search?.match === "between" ||
          (!f.search?.match &&
            "type" in f &&
            (f.type === "daterange" || f.type === "datetimerange")));
      return (
        v.length > 0 && (!between || !v.every((x) => x == null || x === ""))
      );
    }
    return true;
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
        onSubmit={async (v) => {
          await send(v, true, "more");
        }}
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
              // Resets never validate and search exactly once in both modes;
              // `resetting` suppresses the instant auto-send below.
              resetting.current = true;
              try {
                ref.current?.reset(v);
                moreRef.current?.reset(v);
              } finally {
                resetting.current = false;
              }
              latestValues.current = v;
              setLocal(v);
              onChange?.(v);
              void send(v, false);
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
                        ref={moreRef}
                        fields={moreFields}
                        value={current}
                        onChange={change}
                        columns={1}
                        labelPosition="left"
                        density="compact"
                        size={size}
                        disabled={disabled}
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
                          // Same semantics as the main reset: once, no
                          // validation, stale errors cleared, both modes.
                          resetting.current = true;
                          try {
                            moreRef.current?.reset(resetDraft);
                            ref.current?.setValidationErrors({});
                          } finally {
                            resetting.current = false;
                          }
                          latestValues.current = resetDraft;
                          setLocal(resetDraft);
                          onChange?.(resetDraft);
                          void send(resetDraft, false);
                        }}
                      >
                        {resetLabel ?? tr("Reset")}
                      </button>
                      <button
                        type="button"
                        className="auto-primary"
                        disabled={disabled}
                        onClick={() => {
                          // Validate main + more fields against the outgoing
                          // values; close only when validation passed.
                          void (async () => {
                            if (await send(current, true))
                              setPopoverOpen(false);
                          })();
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
