import { useEffect } from "react";
import { devWarn, resetDevWarnings, valueKind } from "./errors";
import type { ChoiceFieldType } from "./types";

/** The field props dev mode can check without knowing T. */
interface WarnField {
  name?: string;
  type?: string;
  options?: unknown;
  render?: unknown;
  component?: string;
  defaultValue?: unknown;
  match?: string;
  search?: { match?: string };
}

const CHOICE = new Set<ChoiceFieldType>([
  "select",
  "select-v2",
  "virtual-select",
  "radio",
  "checkbox",
  "cascader",
]);

let styleChecked = false;

/** Forget dev-warning dedupe and the one-shot CSS check. Tests only. */
export function resetDevChecks() {
  resetDevWarnings();
  styleChecked = false;
}

function isPair(value: unknown): boolean {
  return Array.isArray(value) && value.length === 2;
}

/**
 * Warn for field contracts that `AnyField` / `unsafeField` can bypass.
 * `values` is the current form value, so a controlled scalar on a date range is visible.
 */
export function warnFields(
  component: string,
  fields: readonly WarnField[] | undefined,
  values?: object,
) {
  if (!fields) return;
  const record = values as Record<string, unknown> | undefined;
  for (const field of fields) {
    const name = field.name ?? "(unnamed)";
    if (
      field.type &&
      CHOICE.has(field.type as ChoiceFieldType) &&
      (field.options == null ||
        (Array.isArray(field.options) && field.options.length === 0))
    ) {
      devWarn(
        component,
        "RAC-FIELD-OPTIONS",
        `fields["${name}"] type="${field.type}" has no options.`,
        "Pass options: Option[] or options(values). autocomplete may omit options; select, select-v2, radio, checkbox, and cascader may not.",
      );
    }
    if (field.type === "custom" && !field.render && !field.component) {
      devWarn(
        component,
        "RAC-FIELD-CUSTOM",
        `fields["${name}"] type="custom" has neither render nor component.`,
        "Pass render(context) or component: a key registered on AutoConfigProvider config.fields.",
      );
    }
    const sample =
      field.defaultValue !== undefined
        ? field.defaultValue
        : field.name
          ? record?.[field.name]
          : undefined;
    if (
      (field.type === "daterange" || field.type === "datetimerange") &&
      sample !== undefined &&
      !isPair(sample)
    ) {
      devWarn(
        component,
        "RAC-FIELD-RANGE",
        `fields["${name}"] type="${field.type}" value is ${valueKind(sample)}, not a two-item array.`,
        'Store [start, end]. dateValue "string" uses YYYY-MM-DD; "timestamp" uses epoch milliseconds. Null is an open end.',
      );
    }
    const match = field.search?.match ?? field.match;
    if (match === "between" && sample !== undefined && !isPair(sample)) {
      devWarn(
        component,
        "RAC-FIELD-BETWEEN",
        `fields["${name}"] match="between" value is ${valueKind(sample)}, not a two-item array.`,
        "Store [from, to] on this field. A scalar never matches a between query.",
      );
    }
  }
}

export function warnRowKeys<T extends object>(
  rows: readonly T[] | undefined,
  rowKey: keyof T | ((row: T) => string),
) {
  if (!rows?.length) return;
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const raw =
      typeof rowKey === "function"
        ? rowKey(row)
        : (row as Record<string, unknown>)[rowKey as string];
    if (raw == null || raw === "") {
      devWarn(
        "AutoTable",
        "RAC-TABLE-ROWID",
        `rowKey is missing on row ${index}.`,
        "Every row needs a stable string id. rowKey can be a field name or (row) => string. Selection, expansion, and scrollToRow use it.",
      );
      return;
    }
    const id = String(raw);
    if (seen.has(id)) {
      devWarn(
        "AutoTable",
        "RAC-TABLE-ROWID",
        `rowKey produced duplicate id "${id}".`,
        "rowKey must be unique per loaded row. Duplicate ids collapse selection and virtual row identity.",
      );
    }
    seen.add(id);
  });
}

export function warnTableId(id: string, namespace: string) {
  if (id.trim()) return;
  devWarn(
    "AutoTable",
    "RAC-TABLE-ID",
    `id is empty. Table settings would be stored at "${namespace}:table:".`,
    "Pass a stable id per table. Set AutoConfigProvider namespace so two apps on one origin do not share localStorage keys.",
  );
}

/**
 * style.css sets `--auto-text` on `:root`. If it is missing, the page is unstyled and the DOM does not say why.
 * Warns once per page load.
 */
export function warnIfStylesMissing() {
  if (styleChecked || typeof document === "undefined") return;
  styleChecked = true;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--auto-text")
    .trim();
  if (!value) {
    devWarn(
      "react-auto-components",
      "RAC-CSS-MISSING",
      "style.css is not loaded. --auto-text is unset, so components render with browser defaults and no error.",
      'Import "@zeroman.yang/react-auto-components/style.css" once in the app entry, before the first render.',
    );
  }
}

export function useLibraryStyles() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    warnIfStylesMissing();
  }, []);
}

export function useFieldWarnings(
  component: string,
  fields: readonly WarnField[] | undefined,
  values?: object,
) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    warnFields(component, fields, values);
  }, [component, fields, values]);
}
