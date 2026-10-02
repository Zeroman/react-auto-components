import { emptyQuery, isQueryNode, type QueryNode } from "../../core/query";
import type { TableSort } from "./types";
export interface Layout {
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
  pin: Record<string, "left" | "right" | null | undefined>;
  density: "inherit" | "compact" | "normal" | "comfortable";
}
export interface ExportSettings {
  columns: string[];
  format: "csv" | "json" | "xlsx";
  scope: "page" | "filtered" | "selected";
  fileName: string;
}
export interface Presets<V> {
  activeId: string;
  version: string | number;
  presets: { id: string; name: string; value: V }[];
}
export interface TableSettings {
  layout: Presets<Layout>;
  sort: Presets<TableSort[]>;
  filter: Presets<QueryNode>;
  export: Presets<ExportSettings>;
}
const group = <V>(value: V): Presets<V> => ({
  activeId: "default",
  version: 1,
  presets: [{ id: "default", name: "Default preset", value }],
});
export function initialSettings(
  keys: string[],
  base: Partial<Layout> = {},
): TableSettings {
  return {
    layout: group({
      order: keys,
      hidden: [],
      widths: {},
      pin: {},
      density: "inherit",
      ...base,
    }),
    sort: group([]),
    filter: group(emptyQuery),
    export: group({
      columns: keys,
      format: "csv",
      scope: "filtered",
      fileName: "export",
    }),
  };
}
export function active<V>(g: Presets<V>): V {
  return (g.presets.find((p) => p.id === g.activeId) ?? g.presets[0]).value;
}
export function replaceActive<V>(g: Presets<V>, value: V): Presets<V> {
  return {
    ...g,
    presets: g.presets.map((p) => (p.id === g.activeId ? { ...p, value } : p)),
  };
}
export function reconcileSettings(
  saved: unknown,
  keys: string[],
  versions: Partial<Record<keyof TableSettings, string | number>>,
  base: Partial<Layout> = {},
): TableSettings {
  const fresh = initialSettings(keys, base);
  if (!saved || typeof saved !== "object") saved = fresh;
  const raw = saved as TableSettings;
  for (const category of ["layout", "sort", "filter", "export"] as const) {
    const version = versions[category] ?? 1;
    fresh[category].version = version;
    const candidate = raw[category];
    if (
      candidate?.version === version &&
      Array.isArray(candidate.presets) &&
      candidate.presets.length &&
      candidate.presets.every(
        (p) =>
          p &&
          typeof p.id === "string" &&
          typeof p.name === "string" &&
          p.value != null,
      )
    ) {
      Object.assign(fresh[category], structuredClone(candidate));
      if (!candidate.presets.some((p) => p.id === candidate.activeId))
        fresh[category].activeId = candidate.presets[0].id;
    }
  }
  try {
    for (const p of fresh.layout.presets) {
      const old = p.value;
      p.value = {
        order: [
          ...new Set([...old.order.filter((k) => keys.includes(k)), ...keys]),
        ],
        hidden: old.hidden.filter((k) => keys.includes(k)),
        widths: Object.fromEntries(
          Object.entries(old.widths).filter(
            ([k, v]) => keys.includes(k) && Number.isFinite(v) && v >= 40,
          ),
        ),
        pin: Object.fromEntries(
          Object.entries(old.pin).filter(
            ([k, v]) =>
              keys.includes(k) && (v === "left" || v === "right" || v === null),
          ),
        ),
        density: ["inherit", "compact", "normal", "comfortable"].includes(
          old.density,
        )
          ? old.density
          : "inherit",
      };
    }
    for (const p of fresh.sort.presets)
      p.value = p.value.filter(
        (s) => keys.includes(s.id) && typeof s.desc === "boolean",
      );
    for (const p of fresh.filter.presets) {
      if (!isQueryNode(p.value, keys)) p.value = emptyQuery;
    }
    for (const p of fresh.export.presets) {
      p.value.columns = p.value.columns.filter((k) => keys.includes(k));
      if (!["csv", "json", "xlsx"].includes(p.value.format))
        p.value.format = "csv";
      if (!["page", "filtered", "selected"].includes(p.value.scope))
        p.value.scope = "filtered";
      if (typeof p.value.fileName !== "string") p.value.fileName = "export";
    }
  } catch {
    return initialSettings(keys, base);
  }
  return fresh;
}
