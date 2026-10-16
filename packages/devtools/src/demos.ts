import { RacError } from "./errors.js";
import type { DemoScenario, DemoState, DemoAction } from "./protocol.js";
import { PageRegistry } from "./registry.js";

interface Run {
  pageId: string;
  connectionId: string;
  definition: DemoScenario;
  state: DemoState;
  controller: AbortController;
  lastSeen: number;
  cancelled: boolean;
}
const active = (run: Run) => ["running", "stopping"].includes(run.state.phase);
const problem = (message: string) =>
  new RacError(
    "RAC-PAGE-ACTION",
    message,
    "Stop the demonstration, inspect the selected page, and start again explicitly.",
  );
const disconnected = () =>
  new RacError(
    "RAC-PAGE-DISCONNECTED",
    "The demonstration's page connection is no longer available.",
    "Reload the page and start a new demonstration explicitly. No actions are retried.",
  );
function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
function routeMatches(url: string, route: string) {
  try {
    return new URL(url).hash.split("?")[0] === `#/${route}`;
  } catch {
    return false;
  }
}

/** Executes the same registry commands as the CLI, scoped to one connection. */
export class DemoRunner {
  private runs = new Map<string, Run>();
  private closed = false;
  constructor(
    private registry: PageRegistry,
    private definitions: Record<string, DemoScenario> = {},
  ) {}

  private page(pageId: string, connectionId: string) {
    if (this.closed) throw disconnected();
    const page = this.registry.select(pageId);
    if (page.connectionId !== connectionId) throw disconnected();
    return page;
  }
  private idle(): DemoState {
    return {
      available: Object.keys(this.definitions),
      phase: "idle",
      step: 0,
      total: 0,
    };
  }
  status(pageId: string, connectionId: string): DemoState {
    this.page(pageId, connectionId);
    const run = this.runs.get(pageId);
    if (!run || run.connectionId !== connectionId) return this.idle();
    run.lastSeen = Date.now();
    return { ...run.state };
  }
  start(pageId: string, connectionId: string, scenario: string): DemoState {
    const page = this.page(pageId, connectionId);
    if (!Object.hasOwn(this.definitions, scenario))
      throw new RacError(
        "RAC-DEVTOOLS-INPUT",
        "The requested demonstration is not registered.",
        "Select a demonstration configured by this development server.",
      );
    const definition = this.definitions[scenario];
    if (!routeMatches(page.url, definition.route))
      throw problem(
        "Open the demonstration's matching page before starting it.",
      );
    const old = this.runs.get(pageId);
    if (old && active(old)) {
      if (old.connectionId === connectionId)
        throw problem("A demonstration is already running on this page.");
      old.controller.abort(disconnected());
    }
    if (
      !definition.steps.length ||
      definition.steps.length > 40 ||
      definition.steps.some(
        (s) =>
          s.holdMs !== undefined &&
          (!Number.isFinite(s.holdMs) || s.holdMs < 0 || s.holdMs > 10000),
      )
    )
      throw problem("The configured demonstration has invalid step bounds.");
    for (const [id, entry] of this.runs) {
      if (this.runs.size < 200) break;
      if (!active(entry)) this.runs.delete(id);
    }
    if (this.runs.size >= 200 && !this.runs.has(pageId))
      throw problem("Too many demonstrations are active.");
    const run: Run = {
      pageId,
      connectionId,
      definition,
      controller: new AbortController(),
      cancelled: false,
      lastSeen: 0,
      state: {
        ...this.idle(),
        phase: "running",
        scenario,
        total: definition.steps.length,
      },
    };
    this.runs.set(pageId, run);
    void this.execute(run);
    return { ...run.state };
  }
  stop(pageId: string, connectionId: string): DemoState {
    this.page(pageId, connectionId);
    const run = this.runs.get(pageId);
    if (!run || run.connectionId !== connectionId) return this.idle();
    if (active(run)) {
      run.cancelled = true;
      run.state.phase = "stopping";
      run.controller.abort(new Error("Demonstration stopped."));
    }
    return { ...run.state };
  }
  private guard(run: Run, heartbeat = true) {
    if (run.controller.signal.aborted) throw run.controller.signal.reason;
    const page = this.page(run.pageId, run.connectionId);
    if (heartbeat && Date.now() - run.lastSeen > 5000) throw disconnected();
    if (!routeMatches(page.url, run.definition.route))
      throw problem("The page left the demonstration route.");
  }
  private async command(
    run: Run,
    cmd: string,
    payload: Record<string, unknown> = {},
  ) {
    this.guard(run);
    const result = await this.registry.command(run.pageId, cmd, payload, 3000);
    this.guard(run);
    return result;
  }
  private async act(run: Run, action: DemoAction) {
    const snapshot = (await this.command(run, "inspect")) as {
      url: string;
      elements: {
        ref: string;
        name: string;
        testid?: string;
        actions: string[];
        disabled: boolean;
      }[];
      components: { type: string; fields: string[] }[];
    };
    if (!routeMatches(snapshot.url, run.definition.route))
      throw problem("The page left the demonstration route.");
    const fields = action.component
      ? new Set(
          snapshot.components
            .filter((c) => c.type === action.component)
            .flatMap((c) => c.fields),
        )
      : undefined;
    const matches = snapshot.elements.filter(
      (e) =>
        !e.disabled &&
        e.actions.includes(action.cmd) &&
        (!fields || fields.has(e.ref)) &&
        (action.testid
          ? e.testid === action.testid
          : action.names?.includes(e.name)),
    );
    if (matches.length !== 1)
      throw problem("The demonstration control is missing or ambiguous.");
    await this.command(run, action.cmd, {
      ref: matches[0].ref,
      ...(action.cmd === "fill" ? { value: action.value ?? "" } : {}),
    });
  }
  private async execute(run: Run) {
    const deadline = setTimeout(
      () =>
        run.controller.abort(
          problem("The demonstration exceeded its time limit."),
        ),
      120000,
    );
    try {
      for (const [index, step] of run.definition.steps.entries()) {
        this.guard(run, index !== 0);
        Object.assign(run.state, {
          step: index + 1,
          message: step.message,
          focus: step.focus,
        });
        // Leave about three seconds to read the guidance after the 300 ms
        // status poll renders it, then change the actual control.
        await delay(3500, run.controller.signal);
        this.guard(run);
        if (step.action) await this.act(run, step.action);
        await delay(step.holdMs ?? 3000, run.controller.signal);
      }
      this.guard(run);
      run.state.phase = "complete";
    } catch (error) {
      run.state.phase = run.cancelled ? "stopped" : "error";
      if (!run.cancelled)
        run.state.error = (
          error instanceof Error ? error.message : String(error)
        ).slice(0, 1000);
    } finally {
      clearTimeout(deadline);
    }
  }
  dispose() {
    this.closed = true;
    for (const run of this.runs.values()) run.controller.abort(disconnected());
    this.runs.clear();
  }
}
