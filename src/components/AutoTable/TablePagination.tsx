import { useAutoText } from "../../core/i18n";

/** Pagination footer props. */
export interface TablePaginationProps {
  pageIndex: number;
  pageSize: number;
  pages: number;
  /** Filtered row total, shown beside the page indicator. */
  total: number;
  pageSizeOptions?: readonly number[];
  onChange: (patch: { pageIndex: number; pageSize?: number }) => void;
}

export function TablePagination({
  pageIndex,
  pageSize,
  pages,
  total,
  pageSizeOptions,
  onChange,
}: TablePaginationProps) {
  const tr = useAutoText();
  const options = pageSizeOptions ?? [10, 20, 50, 100];

  return (
    <footer className="auto-pagination">
      <span>{tr("{0} records", [total.toLocaleString()])}</span>
      <span>{tr("Page {0} / {1}", [pageIndex + 1, pages])}</span>
      <div className="auto-actions">
        <select
          aria-label={tr("Rows per page")}
          value={pageSize}
          onChange={(e) =>
            onChange({
              pageIndex: 0,
              pageSize: Number(e.target.value),
            })
          }
        >
          {options.map((n) => (
            <option key={n} value={n}>
              {tr("{0} / page", [n])}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={tr("Previous page")}
          disabled={pageIndex === 0}
          onClick={() =>
            onChange({
              pageIndex: pageIndex - 1,
            })
          }
        >
          ←
        </button>
        <button
          type="button"
          aria-label={tr("Next page")}
          disabled={pageIndex + 1 >= pages}
          onClick={() =>
            onChange({
              pageIndex: pageIndex + 1,
            })
          }
        >
          →
        </button>
      </div>
    </footer>
  );
}
