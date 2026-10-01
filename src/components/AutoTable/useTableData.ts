import { useCallback, useEffect, useRef, useState } from "react";
import type { DataSource, TableQuery } from "./types";
import { errorMessage } from "../../core/config";
export function useTableData<T extends object>(
  data: readonly T[] | undefined,
  source: DataSource<T> | undefined,
  query: TableQuery,
) {
  const [remote, setRemote] = useState<{ rows: T[]; total: number }>({
    rows: [],
    total: 0,
  });
  const [settledQuery, setSettledQuery] = useState<string | null>(null);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const queryKey = JSON.stringify(query);
  const enabled = !!source;
  useEffect(() => {
    if (!enabled) return;
    const c = new AbortController();
    setLoading(true);
    setError("");
    Promise.resolve()
      .then(() =>
        sourceRef.current!(JSON.parse(queryKey), { signal: c.signal }),
      )
      .then((result) => {
        if (!c.signal.aborted) {
          setRemote(result);
          setSettledQuery(queryKey);
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [queryKey, version, enabled]);
  return {
    resolved: data !== undefined || settledQuery === queryKey,
    rows: data ?? remote.rows,
    total: data?.length ?? remote.total,
    loading,
    error,
    refresh: useCallback(() => setVersion((v) => v + 1), []),
  };
}
