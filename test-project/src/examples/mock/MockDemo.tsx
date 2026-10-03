import { useEffect, useState, type ReactNode } from "react";
import { useDemoText } from "../../i18n";
import "./mock.css";

export type MockScenario = "normal" | "restricted" | "empty" | "error";

/** In-browser transport stand-in: only JSON-like payloads cross this boundary. */
export async function mockRequest<T>(
  payload: T,
  options: { signal?: AbortSignal; delay?: number; fail?: boolean } = {},
): Promise<T> {
  const { signal, delay = 350, fail = false } = options;
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, delay);
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
  if (fail) throw new Error("mock.requestFailed");
  return structuredClone(payload);
}

export interface MockDemoProps<T> {
  title: string;
  description: string;
  load: (scenario: MockScenario, signal: AbortSignal) => Promise<T>;
  children: (context: {
    data: T;
    scenario: MockScenario;
    reload: () => void;
  }) => ReactNode;
}

export function MockDemo<T>({
  title,
  description,
  load,
  children,
}: MockDemoProps<T>) {
  const tr = useDemoText();
  const [scenario, setScenario] = useState<MockScenario>("normal");
  const [revision, setRevision] = useState(0);
  const requestKey = `${scenario}-${revision}`;
  const [state, setState] = useState<{
    requestKey?: string;
    data?: T;
    loading: boolean;
    error?: string;
  }>({ loading: true });
  const loading = state.loading || state.requestKey !== requestKey;
  const reload = () => setRevision((value) => value + 1);
  useEffect(() => {
    const controller = new AbortController();
    setState({ requestKey, loading: true });
    const request =
      scenario === "error"
        ? mockRequest<T>(undefined as T, {
            signal: controller.signal,
            fail: true,
          })
        : load(scenario, controller.signal);
    request.then(
      (data) => {
        if (!controller.signal.aborted)
          setState({ requestKey, data, loading: false });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            requestKey,
            loading: false,
            error: error instanceof Error ? error.message : String(error),
          });
      },
    );
    return () => controller.abort();
  }, [load, scenario, requestKey]);
  return (
    <section
      className="card auto-root mock-demo"
      data-testid="server-driven-demo"
    >
      <h2>{tr(title)}</h2>
      <p className="muted">{tr(description)}</p>
      <div className="auto-actions mock-controls">
        <label>
          {tr("mock.response")}{" "}
          <select
            aria-label={tr("mock.response")}
            value={scenario}
            onChange={(event) =>
              setScenario(event.target.value as MockScenario)
            }
          >
            <option value="normal">{tr("mock.normal")}</option>
            <option value="restricted">{tr("mock.restricted")}</option>
            <option value="empty">{tr("mock.empty")}</option>
            <option value="error">{tr("mock.error")}</option>
          </select>
        </label>
        <button type="button" onClick={reload} disabled={loading}>
          {tr("mock.reload")}
        </button>
        <span className="auto-badge">Mock</span>
      </div>
      {loading ? (
        <p role="status">{tr("mock.loading")}</p>
      ) : state.error ? (
        <div role="alert" className="auto-error">
          {tr(state.error)}{" "}
          <button
            type="button"
            onClick={() => {
              setScenario("normal");
              reload();
            }}
          >
            {tr("mock.retry")}
          </button>
        </div>
      ) : (
        <div key={requestKey} className="mock-content">
          {children({ data: state.data as T, scenario, reload })}
          <details className="mock-response">
            <summary>{tr("mock.payload")}</summary>
            <pre>{JSON.stringify(state.data, null, 2)}</pre>
          </details>
        </div>
      )}
    </section>
  );
}
