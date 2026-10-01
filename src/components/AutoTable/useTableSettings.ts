import { useEffect, useRef, useState } from "react";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { errorMessage } from "../../core/config";
import { reconcileSettings, type Layout, type TableSettings } from "./settings";
export function useTableSettings(
  id: string,
  keys: string[],
  versions: Partial<Record<keyof TableSettings, string | number>> = {},
  base: Partial<Layout> = {},
) {
  const services = useAutoConfig();
  const key = `${services.namespace}:table:${id}`;
  const signature = JSON.stringify([key, keys, versions]);
  const [settings, set] = useState(() =>
    reconcileSettings(services.storage.get(key), keys, versions, base),
  );
  const [error, setError] = useState("");
  const revision = useRef(0);
  const queue = useRef(Promise.resolve());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const rev = ++revision.current;
    set(reconcileSettings(services.storage.get(key), keys, versions, base));
    let alive = true;
    if (services.settings)
      services.settings
        .load(key)
        .then((saved) => {
          if (alive && revision.current === rev && saved) {
            set(reconcileSettings(saved, keys, versions, base));
          }
        })
        .catch((e) => {
          if (alive) setError(errorMessage(e));
        });
    return () => {
      alive = false;
    };
  }, [signature, services.storage, services.settings]);
  function update(next: TableSettings) {
    revision.current++;
    set(next);
    services.storage.set(key, next);
    setError("");
    if (services.settings) {
      const adapter = services.settings;
      queue.current = queue.current
        .catch(() => {})
        .then(() => adapter.save(key, next))
        .catch((e) => {
          if (mounted.current) setError(errorMessage(e));
        });
    }
  }
  return { settings, update, error, retry: () => update(settings) };
}
