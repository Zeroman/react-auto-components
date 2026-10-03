import { useEffect, useState } from "react";
import {
  useAutoRoute,
  useAutoNavigation,
  type AutoNavigationResult,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";

export interface NavigationDemoProps {
  role: string;
  onToggleRole: () => void;
}

export function NavigationDemo({ role, onToggleRole }: NavigationDemoProps) {
  const tr = useDemoText();
  const nav = useAutoNavigation();
  const { nodePath, activeChild, params, goto, setParams, signal } =
    useAutoRoute({
      name: "tree-demo",
      defaultChild: "details",
      children: [
        { id: "overview", label: tr("Overview") },
        { id: "details", label: tr("Details (Deep Params)") },
        {
          id: "admin-audit",
          label: tr("Admin Audit (Restricted)"),
          roles: ["admin"],
        },
      ],
    });

  const [counter, setCounter] = useState(0);
  const [requestLog, setRequestLog] = useState<string>(() => tr("Ready"));
  const [lastResult, setLastResult] = useState<AutoNavigationResult | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    setRequestLog(
      `${tr("Loading data for projectId")}: ${params.projectId ?? tr("none")} ...`,
    );
    const timer = setTimeout(() => {
      if (active) {
        setRequestLog(
          `${tr("Data loaded successfully for projectId")} ${params.projectId ?? tr("none")}`,
        );
      }
    }, 200);

    const abortHandler = () => {
      if (active) {
        setRequestLog(
          tr("Request cancelled by navigation transition (AbortSignal)."),
        );
      }
    };
    signal.addEventListener("abort", abortHandler);

    return () => {
      active = false;
      clearTimeout(timer);
      signal.removeEventListener("abort", abortHandler);
    };
  }, [params.projectId, signal, tr]);

  const handleGoto = async (
    target: string,
    options?: Parameters<typeof goto>[1],
  ) => {
    const res = await goto(target, options);
    setLastResult(res);
    return res;
  };

  return (
    <section
      className="card"
      data-testid="interactive-nav-demo"
      style={{
        padding: "20px",
        margin: "12px",
        background: "var(--auto-bg, #ffffff)",
        border: "1px solid var(--auto-border, #dce4df)",
        borderRadius: "8px",
        color: "var(--auto-text, #202e29)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "18px" }}>
          {tr("Component Tree Navigation Demo")}
        </h2>
        <button
          type="button"
          className="code-button"
          onClick={onToggleRole}
          style={{ fontSize: "12px", height: "26px" }}
        >
          {tr("Role")}: <strong>{role}</strong> ({tr("Click to toggle")})
        </button>
      </div>

      <p
        style={{
          margin: "10px 0",
          color: "var(--auto-secondary, #65746d)",
          fontSize: "13px",
        }}
      >
        {tr("Structural path")}: <code>{nodePath.join(":") || "/"}</code> |{" "}
        {tr("Active child")}:{" "}
        <strong
          data-testid="tree-active-child"
          style={{ color: "var(--auto-accent, #176b54)" }}
        >
          {activeChild}
        </strong>
      </p>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          margin: "14px 0",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="code-button"
          onClick={() => handleGoto("./overview")}
        >
          {tr("Relative:")} ./overview
        </button>
        <button
          type="button"
          className="code-button"
          onClick={async () => {
            const next = counter + 1;
            setCounter(next);
            await handleGoto("./details", {
              params: { projectId: String(next), tab: "specs" },
            });
          }}
        >
          {tr("Set Param")} projectId={counter + 1}
        </button>
        <button
          type="button"
          className="code-button"
          onClick={() => setParams({ tab: "audit", version: "v2" })}
        >
          setParams(tab=audit, v=v2)
        </button>
        <button
          type="button"
          className="code-button"
          onClick={() => handleGoto("./admin-audit")}
        >
          {tr("Enter Admin Audit (Restricted)")}
        </button>
        <button
          type="button"
          className="code-button"
          onClick={async () => {
            const res = await nav.goto("nonexistent:route", { timeoutMs: 50 });
            setLastResult(res);
          }}
        >
          {tr("Test Unknown Route")}
        </button>
      </div>

      {/* Result feedback notification */}
      {lastResult && (
        <div
          data-testid="last-navigation-result"
          style={{
            margin: "10px 0",
            padding: "8px 12px",
            fontSize: "12px",
            borderRadius: "6px",
            background:
              lastResult.status === "success"
                ? "rgba(16, 185, 129, 0.1)"
                : lastResult.status === "forbidden"
                  ? "rgba(239, 68, 68, 0.1)"
                  : "rgba(245, 158, 11, 0.1)",
            border: `1px solid ${
              lastResult.status === "success"
                ? "rgba(16, 185, 129, 0.3)"
                : lastResult.status === "forbidden"
                  ? "rgba(239, 68, 68, 0.3)"
                  : "rgba(245, 158, 11, 0.3)"
            }`,
          }}
        >
          <strong>{tr("Navigation Result")}:</strong>{" "}
          <span style={{ textTransform: "uppercase", fontWeight: 600 }}>
            {lastResult.status}
          </span>
          {lastResult.error && <span> — {lastResult.error}</span>}
        </div>
      )}

      {/* Parameter inspection card */}
      <div
        style={{
          padding: "12px",
          background: "var(--auto-muted, #f4f6f5)",
          border: "1px solid var(--auto-border, #dce4df)",
          borderRadius: "6px",
          fontSize: "13px",
        }}
      >
        <div>
          {tr("Param")} <strong>projectId</strong>:{" "}
          <span data-testid="param-project-id">
            {params.projectId ?? tr("(empty)")}
          </span>
        </div>
        <div>
          {tr("Param")} <strong>tab</strong>:{" "}
          <span data-testid="param-tab">{params.tab ?? tr("(empty)")}</span>
        </div>
        <div>
          {tr("Param")} <strong>version</strong>:{" "}
          <span data-testid="param-version">
            {params.version ?? tr("(empty)")}
          </span>
        </div>
        <div style={{ marginTop: "8px", color: "var(--auto-accent, #176b54)" }}>
          <strong>{tr("Async Request Status")}:</strong> {requestLog}
        </div>
      </div>

      {activeChild === "admin-audit" && (
        <div
          data-testid="admin-audit-content"
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "rgba(23, 107, 84, 0.08)",
            border: "1px solid rgba(23, 107, 84, 0.4)",
            borderRadius: "6px",
            color: "var(--auto-text, #202e29)",
          }}
        >
          <strong>{tr("Admin Audit View")}</strong>:{" "}
          {tr("Access granted for role 'admin'.")}
        </div>
      )}
    </section>
  );
}
