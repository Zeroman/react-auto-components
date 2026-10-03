import type { Field } from "../../core/types";
import type { AutoColumn } from "./types";

/**
 * Derives AutoForm field definitions from AutoTable columns for add/edit dialogs.
 */
export function deriveFormFields<T extends object>(
  columns: readonly AutoColumn<T>[],
): Field<T>[] {
  return columns
    .filter((c) => c.formField !== false)
    .map((c) => {
      const custom =
        typeof c.formField === "object"
          ? (c.formField as Record<string, unknown>)
          : undefined;
      const base = {
        name: c.key,
        label: c.label,
        tip: c.tip,
        tipComponent: c.tipComponent,
        ...custom,
      };

      if (custom?.type) {
        return base as Field<T>;
      }
      if (c.options && c.options.length > 0) {
        return {
          ...base,
          type: "select" as const,
          options: c.options,
        } as Field<T>;
      }
      switch (c.type) {
        case "number":
          return { ...base, type: "integer" as const } as Field<T>;
        case "percentage":
          return { ...base, type: "percentage" as const } as Field<T>;
        case "progress":
          return { ...base, type: "progress" as const } as Field<T>;
        case "date":
          return { ...base, type: "date" as const } as Field<T>;
        case "datetime":
          return { ...base, type: "datetime" as const } as Field<T>;
        default:
          return { ...base, type: "input" as const } as Field<T>;
      }
    });
}
