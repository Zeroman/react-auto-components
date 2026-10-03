import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { Row } from "@tanstack/react-table";
import { racTestId } from "../../core/testid";
import { errorMessage } from "../../core/config";
import type { features } from "./features";
import type { AutoColumn } from "./types";

export interface TableRowProps<T extends object> {
  row: Row<typeof features, T>;
  index: number;
  rows: readonly Row<typeof features, T>[];
  ordered: readonly AutoColumn<T>[];
  current: string;
  setCurrent: (id: string) => void;
  selected: boolean;
  effectiveVirtual: boolean;
  renderExpanded?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string | undefined;
  rowStyle?: (row: T) => CSSProperties | undefined;
  itemHeight: number | undefined;
  measureRef?: (element: HTMLElement | null) => void;
  cellStyle: (column: AutoColumn<T>) => CSSProperties | undefined;
  formatted: (column: AutoColumn<T>, row: T) => string | number | ReactNode;
  rowLoading?: (row: T) => boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  colCount: number;
  setMessage: (msg: string) => void;
  tr: (key: string, values?: readonly unknown[]) => string;
}

export function TableRow<T extends object>({
  row,
  index,
  rows,
  ordered,
  current,
  setCurrent,
  selected,
  effectiveVirtual,
  renderExpanded,
  rowClassName,
  rowStyle,
  itemHeight,
  measureRef,
  cellStyle,
  formatted,
  rowLoading,
  onEdit,
  onDelete,
  colCount,
  setMessage,
  tr,
}: TableRowProps<T>) {
  const rowNode = (
    <tr
      data-row-id={row.id}
      data-index={index}
      ref={effectiveVirtual && !renderExpanded ? measureRef : undefined}
      className={`${current === row.id ? "auto-current" : ""} ${rowClassName?.(row.original) ?? ""}`}
      style={{
        height: itemHeight,
        ...rowStyle?.(row.original),
      }}
      onClick={() => setCurrent(row.id)}
    >
      <td className="auto-table-cell-selection">
        <input
          type="checkbox"
          aria-label={tr("Select row {0}", [row.id])}
          checked={selected}
          onChange={row.getToggleSelectedHandler()}
        />
      </td>
      {ordered.map((c, ci) => {
        let span = 1;
        if (c.merge) {
          const val = row.original[c.key];
          if (
            index > 0 &&
            !(renderExpanded && rows[index - 1].getIsExpanded()) &&
            Object.is(rows[index - 1].original[c.key], val)
          )
            return null;
          while (
            index + span < rows.length &&
            !(renderExpanded && rows[index + span - 1].getIsExpanded()) &&
            Object.is(rows[index + span].original[c.key], val)
          )
            span++;
        }
        const value = row.original[c.key];
        return (
          <td
            key={c.key}
            rowSpan={span}
            style={cellStyle(c)}
            tabIndex={0}
            onDoubleClick={() => {
              if (c.copyable)
                void navigator.clipboard
                  .writeText(String(formatted(c, row.original)))
                  .then(() => setMessage(tr("Copied")))
                  .catch((e) => setMessage(tr(errorMessage(e))));
            }}
          >
            <div className="auto-cell">
              {ci === 0 && row.getCanExpand() && (
                <button
                  className="auto-expand"
                  style={{
                    marginLeft: row.depth * 16,
                  }}
                  data-testid={racTestId("expand", row.id)}
                  aria-label={tr("Expand row {0}", [row.id])}
                  aria-expanded={row.getIsExpanded()}
                  onClick={row.getToggleExpandedHandler()}
                >
                  {row.getIsExpanded() ? "−" : "+"}
                </button>
              )}
              {rowLoading?.(row.original) ? (
                <span className="auto-skeleton">{tr("Loading…")}</span>
              ) : c.render ? (
                c.render(value, row.original, index)
              ) : c.type === "progress" ? (
                <progress value={Number(value ?? 0)} max={100} />
              ) : (
                formatted(c, row.original)
              )}
            </div>
          </td>
        );
      })}
      <>
        {(onEdit || onDelete) && (
          <td>
            <div className="auto-actions auto-row-actions">
              {onEdit && (
                <button
                  data-testid={racTestId("edit", row.id)}
                  aria-label={tr("Edit row {0}", [row.id])}
                  onClick={() => onEdit(row.original)}
                >
                  {tr("Edit")}
                </button>
              )}
              {onDelete && (
                <button
                  data-testid={racTestId("delete", row.id)}
                  aria-label={tr("Delete row {0}", [row.id])}
                  onClick={() => onDelete(row.original)}
                >
                  {tr("Delete")}
                </button>
              )}
            </div>
          </td>
        )}
      </>
    </tr>
  );

  return (
    <Fragment key={row.id}>
      {rowNode}
      {row.getIsExpanded() && renderExpanded && (
        <tr data-expanded-row-id={row.id}>
          <td colSpan={colCount}>{renderExpanded(row.original)}</td>
        </tr>
      )}
    </Fragment>
  );
}
