import { useAutoText } from "../../core/i18n";
import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Option } from "../../core/types";
export function VirtualSelect({
  id,
  value,
  options,
  onChange,
  disabled,
  multiple,
}: {
  id: string;
  value: unknown;
  options: readonly Option[];
  onChange: (value: unknown) => void;
  disabled: boolean;
  multiple?: boolean;
}) {
  const tr = useAutoText();
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const filtered = options.filter((o) =>
    o.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const virtual = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => ref.current,
    estimateSize: () => 36,
    overscan: 4,
  });
  const selected = (o: Option) =>
    multiple
      ? Array.isArray(value) && value.includes(o.value)
      : Object.is(value, o.value);
  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {options
          .filter(selected)
          .map((o) => o.label)
          .join(", ") || tr("Select")}{" "}
        ▾
      </button>
      {open && (
        <div className="auto-select-menu">
          <input
            aria-label={tr("Search options")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div
            ref={ref}
            role="listbox"
            aria-label={tr("Options")}
            aria-multiselectable={multiple}
            style={{
              height: 220,
              overflow: "auto",
            }}
          >
            <div
              style={{
                height: virtual.getTotalSize(),
                position: "relative",
              }}
            >
              {virtual.getVirtualItems().map((item) => {
                const o = filtered[item.index];
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected(o)}
                    disabled={o.disabled}
                    key={item.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      transform: `translateY(${item.start}px)`,
                      height: item.size,
                      width: "100%",
                    }}
                    onClick={() => {
                      onChange(
                        multiple
                          ? selected(o)
                            ? (value as unknown[]).filter((v) => v !== o.value)
                            : [...(Array.isArray(value) ? value : []), o.value]
                          : o.value,
                      );
                      if (!multiple) setOpen(false);
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)}>
            {tr("Done")}
          </button>
        </div>
      )}
    </div>
  );
}
export function Cascader({
  id,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  value: unknown;
  options: readonly Option[];
  onChange: (value: unknown) => void;
  disabled: boolean;
}) {
  const tr = useAutoText();
  const path = Array.isArray(value) ? value : [];
  const levels: (readonly Option[])[] = [];
  let current = options;
  for (let i = 0; current.length; i++) {
    levels.push(current);
    const next = current.find((o) => Object.is(o.value, path[i]));
    if (!next?.children) break;
    current = next.children;
  }
  return (
    <div className="auto-actions">
      {levels.map((level, i) => (
        <select
          key={i}
          id={i === 0 ? id : undefined}
          aria-label={tr("Cascader level {0}", [i + 1])}
          disabled={disabled}
          value={level.findIndex((o) => Object.is(o.value, path[i]))}
          onChange={(e) =>
            onChange([...path.slice(0, i), level[Number(e.target.value)].value])
          }
        >
          <option value={-1} disabled>
            {tr("Select")}
          </option>
          {level.map((o, j) => (
            <option key={j} value={j} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
