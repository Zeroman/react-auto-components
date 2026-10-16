import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDemoText } from "../i18n";
import "./RacDemoControls.css";

type Scenario = "form" | "search";
type Phase =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "complete"
  | "error";
type DemoState = {
  available: string[];
  bridge: "pending" | "ready" | "missing";
  phase: Phase;
  step: number;
  total: number;
  message?: string;
  focus?: string;
  error?: string;
};

const serverPhases = new Set([
  "idle",
  "running",
  "stopping",
  "stopped",
  "complete",
  "error",
]);
const blocked = [
  "pointerdown",
  "pointerup",
  "pointermove",
  "click",
  "dblclick",
  "contextmenu",
  "keydown",
  "keyup",
  "keypress",
  "wheel",
  "touchstart",
  "touchmove",
  "touchend",
];

function send(scenario: Scenario, action: "start" | "stop" | "status") {
  window.dispatchEvent(
    new CustomEvent("rac:demo-request", { detail: { action, scenario } }),
  );
}

function shown(
  tr: (key: string, values?: readonly unknown[]) => string,
  state: DemoState,
  canStart: boolean,
) {
  if (state.phase === "complete") return tr("rac.demo.complete");
  if (state.phase === "stopped") return tr("rac.demo.stopped");
  if (state.phase === "error") {
    return state.error?.startsWith("rac.demo.")
      ? tr(state.error)
      : state.error || tr("rac.demo.error");
  }
  if (state.phase === "stopping") return tr("rac.demo.stopping");
  if (state.phase === "running" && state.total > 0)
    return tr("rac.demo.progress", [state.step, state.total]);
  if (state.phase === "starting" || state.phase === "running")
    return tr("rac.demo.starting");
  if (state.bridge === "pending") return tr("rac.demo.checking");
  return tr(canStart ? "rac.demo.ready" : "rac.demo.unavailable");
}

export function RacDemoControls({ scenario }: { scenario: Scenario }) {
  const tr = useDemoText();
  const startedRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  const [state, setState] = useState<DemoState>({
    available: [],
    bridge: "pending",
    phase: "idle",
    step: 0,
    total: 0,
  });
  phaseRef.current = state.phase;
  const locked =
    state.phase === "starting" ||
    state.phase === "running" ||
    state.phase === "stopping";
  const canStart =
    state.bridge === "ready" && state.available.includes(scenario);

  useEffect(() => {
    let ready = false;
    const poll = window.setInterval(() => {
      if (!ready) send(scenario, "status");
    }, 1000);
    const giveUp = window.setTimeout(() => {
      window.clearInterval(poll);
      if (!ready) {
        setState((current) =>
          current.bridge === "pending"
            ? { ...current, bridge: "missing" }
            : current,
        );
      }
    }, 10000);
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail;
      if (!detail || typeof detail !== "object") return;
      const available = Array.isArray(detail.available)
        ? detail.available.filter(
            (item): item is string => typeof item === "string",
          )
        : undefined;
      if (available) {
        ready = true;
        window.clearInterval(poll);
        window.clearTimeout(giveUp);
      }
      const foreign =
        typeof detail.scenario === "string" && detail.scenario !== scenario;
      setState((current) => {
        let phase = current.phase;
        if (
          !foreign &&
          typeof detail.phase === "string" &&
          serverPhases.has(detail.phase)
        ) {
          const nextPhase = detail.phase as Phase;
          const terminal =
            current.phase === "complete" ||
            current.phase === "stopped" ||
            current.phase === "error";
          const keepIdle =
            (current.phase === "starting" && nextPhase === "idle") ||
            (terminal && nextPhase === "idle");
          if (!keepIdle) phase = nextPhase;
        }
        return {
          ...current,
          available: available ?? current.available,
          bridge: available ? "ready" : current.bridge,
          phase,
          step:
            !foreign && typeof detail.step === "number"
              ? detail.step
              : current.step,
          total:
            !foreign && typeof detail.total === "number"
              ? detail.total
              : current.total,
          message:
            !foreign && typeof detail.message === "string"
              ? detail.message
              : current.message,
          focus:
            !foreign && typeof detail.focus === "string"
              ? detail.focus
              : current.focus,
          error: foreign
            ? current.error
            : typeof detail.error === "string"
              ? detail.error
              : phase === "running" ||
                  phase === "complete" ||
                  phase === "stopped"
                ? undefined
                : current.error,
        };
      });
    };
    window.addEventListener("rac:demo-state", onState);
    send(scenario, "status");
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(giveUp);
      window.removeEventListener("rac:demo-state", onState);
      const phase = phaseRef.current;
      if (
        startedRef.current &&
        (phase === "starting" || phase === "running" || phase === "stopping")
      ) {
        send(scenario, "stop");
      }
    };
  }, [scenario]);

  useEffect(() => {
    if (state.phase !== "starting" && state.phase !== "stopping") return;
    const timer = window.setTimeout(() => {
      setState((current) =>
        current.phase === "starting" || current.phase === "stopping"
          ? { ...current, phase: "error", error: "rac.demo.timeout" }
          : current,
      );
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [state.phase]);

  return (
    <div className="rac-demo">
      {canStart ? (
        <button
          type="button"
          className="rac-demo-start"
          data-testid="rac-demo-start"
          disabled={locked}
          onClick={(event) => {
            event.currentTarget.disabled = true;
            startedRef.current = true;
            setState((current) => ({
              ...current,
              phase: "starting",
              step: 0,
              total: 0,
              message: undefined,
              focus: undefined,
              error: undefined,
            }));
            send(scenario, "start");
          }}
        >
          {tr("rac.demo.start")}
        </button>
      ) : null}
      <p className="rac-demo-state" data-testid="rac-demo-state" role="status">
        {shown(tr, state, canStart)}
      </p>
      {locked ? (
        <DemoShield
          phase={state.phase}
          step={state.step}
          total={state.total}
          message={state.message}
          focus={state.focus}
          onStop={() => {
            setState((current) =>
              current.phase === "stopping"
                ? current
                : { ...current, phase: "stopping" },
            );
            send(scenario, "stop");
          }}
        />
      ) : null}
    </div>
  );
}

function DemoShield(props: {
  phase: Phase;
  step: number;
  total: number;
  message?: string;
  focus?: string;
  onStop: () => void;
}) {
  const tr = useDemoText();
  const panelRef = useRef<HTMLElement>(null);
  const stopRef = useRef<HTMLButtonElement>(null);
  const onStopRef = useRef(props.onStop);
  onStopRef.current = props.onStop;
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [place, setPlace] = useState<"top" | "bottom">("bottom");
  const { focus, step, phase, total, message } = props;

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    stopRef.current?.focus();
    const onEvent = (event: Event) => {
      if (!event.isTrusted) return;
      const key = event instanceof KeyboardEvent ? event.key : "";
      if (key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onStopRef.current();
        return;
      }
      if (key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        stopRef.current?.focus();
        return;
      }
      const panel = panelRef.current;
      if (panel && event.target instanceof Node && panel.contains(event.target))
        return;
      event.preventDefault();
      event.stopPropagation();
    };
    for (const type of blocked)
      window.addEventListener(type, onEvent, { capture: true, passive: false });
    return () => {
      for (const type of blocked)
        window.removeEventListener(type, onEvent, true);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const nodeFor = () => {
      if (!focus) return null;
      const node = document.querySelector(
        `[data-testid="${CSS.escape(focus)}"]`,
      );
      return node instanceof HTMLElement ? node : null;
    };
    const measure = () => {
      const node = nodeFor();
      if (!node) {
        setBox(null);
        setPlace("bottom");
        return;
      }
      const rect = node.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom;
      setBox({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      setPlace(below < 168 && rect.top > below ? "top" : "bottom");
    };
    nodeFor()?.scrollIntoView({ block: "nearest", inline: "nearest" });
    measure();
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    const target = nodeFor();
    if (target) observer.observe(target);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [focus, step]);

  const hint =
    phase === "stopping"
      ? tr("rac.demo.stopping")
      : message
        ? tr(message)
        : tr("rac.demo.watch");
  const progress =
    total > 0
      ? tr("rac.demo.progress", [step, total])
      : tr(phase === "stopping" ? "rac.demo.stopping" : "rac.demo.starting");
  return createPortal(
    <div className="rac-demo-overlay" data-testid="rac-demo-overlay">
      {box ? (
        <div className="rac-demo-highlight" style={box} />
      ) : (
        <div className="rac-demo-dim" />
      )}
      <section
        ref={panelRef}
        className={`rac-demo-panel rac-demo-panel-${place}`}
        role="region"
        aria-label={tr("rac.demo.stop")}
      >
        <div aria-live="polite" aria-atomic="true">
          <p className="rac-demo-progress" data-testid="rac-demo-progress">
            {progress}
          </p>
          <p className="rac-demo-hint" data-testid="rac-demo-hint">
            {hint}
          </p>
        </div>
        <button
          ref={stopRef}
          type="button"
          className="rac-demo-stop"
          data-testid="rac-demo-stop"
          onClick={() => onStopRef.current()}
        >
          {tr("rac.demo.stop")}
        </button>
      </section>
    </div>,
    document.body,
  );
}
