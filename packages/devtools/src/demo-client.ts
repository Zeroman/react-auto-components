import type { DemoState } from "./protocol.js";

/** The credential and page identity remain in the injected client's closure. */
export function attachDemoClient(
  send: (body: Record<string, unknown>) => Promise<DemoState>,
) {
  let closed = false;
  let chain = Promise.resolve();
  let poll: ReturnType<typeof setTimeout> | undefined;
  let state: DemoState = { available: [], phase: "idle", step: 0, total: 0 };
  const publish = (next: DemoState) => {
    state = next;
    window.dispatchEvent(new CustomEvent("rac:demo-state", { detail: next }));
  };
  const enqueue = (action: string, scenario?: string) => {
    clearTimeout(poll);
    // Expiry is measured from the user's click, including time in this queue.
    const expiresAt = Date.now() + 5000;
    chain = chain.then(async () => {
      if (closed) return;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const next = await Promise.race([
          send({
            action,
            ...(action === "start" ? { scenario, expiresAt } : {}),
          }),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(
              () =>
                reject(new Error("The demonstration connection timed out.")),
              8000,
            );
          }),
        ]);
        if (closed) return;
        publish(next);
        if (["running", "stopping"].includes(next.phase))
          poll = setTimeout(() => enqueue("status"), 300);
      } catch (error) {
        if (!closed)
          publish({
            ...state,
            phase: "error",
            error: error instanceof Error ? error.message : String(error),
          });
      } finally {
        clearTimeout(timeout);
      }
    });
  };
  const onRequest = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (!detail || typeof detail !== "object") return;
    const { action, scenario } = detail as {
      action?: unknown;
      scenario?: unknown;
    };
    if (action === "status" || action === "stop") enqueue(action);
    else if (action === "start" && typeof scenario === "string")
      enqueue(action, scenario);
  };
  window.addEventListener("rac:demo-request", onRequest);
  enqueue("status");
  return () => {
    closed = true;
    clearTimeout(poll);
    window.removeEventListener("rac:demo-request", onRequest);
    publish({
      available: [],
      phase: "error",
      step: 0,
      total: 0,
      error: "The demonstration page disconnected.",
    });
  };
}
