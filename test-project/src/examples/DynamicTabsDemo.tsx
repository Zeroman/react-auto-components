import { useMemo, useState } from "react";
import {
  AutoTabs,
  useAutoTabsWorkspace,
  type AutoTabsJSON,
  type AutoWorkspacePage,
  type ComponentDensity,
  type ComponentSize,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";

function textValue(value: AutoTabsJSON | undefined) {
  return typeof value === "string" ? value : "";
}

function isRecord(
  value: AutoTabsJSON | undefined,
): value is { readonly [key: string]: AutoTabsJSON } {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function orderId(params: AutoTabsJSON | undefined) {
  if (!isRecord(params)) return "";
  const id = params.orderId;
  return typeof id === "string" ? id : "";
}

export function DynamicTabsDemo({
  mode,
  size,
  density,
}: {
  mode: "horizontal" | "vertical";
  size?: ComponentSize;
  density?: ComponentDensity;
}) {
  const tr = useDemoText();
  const [guardNotes, setGuardNotes] = useState(false);
  const [notice, setNotice] = useState("");
  const pages = useMemo<Record<string, AutoWorkspacePage>>(
    () => ({
      home: {
        title: tr("Workspace"),
        render: () => (
          <div className="tab-demo-content">
            <h3>{tr("Workspace")}</h3>
            <p>
              {tr("This tab is pinned. Open an order below, or create a note.")}
            </p>
          </div>
        ),
      },
      order: {
        title: tr("Order"),
        render: ({ tab, setState }) => (
          <div className="tab-demo-content">
            <h3>{tr("Order {0}", [orderId(tab.params)])}</h3>
            <p className="auto-muted">
              {tr(
                "Opening the same order again only selects this tab. The note stays.",
              )}
            </p>
            <input
              aria-label={tr("Order note")}
              placeholder={tr("Note kept on this tab")}
              value={textValue(tab.state)}
              onChange={(event) => setState(event.target.value)}
            />
          </div>
        ),
      },
      note: {
        title: tr("Note"),
        render: () => (
          <div className="tab-demo-content">
            <p>{tr("Closing this tab leaves the others in place.")}</p>
          </div>
        ),
      },
      locked: {
        title: tr("Locked"),
        disabled: true,
        render: () => (
          <div className="tab-demo-content">
            <p>{tr("This page is disabled.")}</p>
          </div>
        ),
      },
    }),
    [tr],
  );
  const workspace = useAutoTabsWorkspace({
    workspaceId: "studio-orders",
    pages,
    defaultTabs: [{ id: "home", page: "home", pinned: true }],
    beforeClose: (tab) => {
      if (guardNotes && tab.page === "note") {
        setNotice(tr("Close cancelled"));
        return false;
      }
      setNotice("");
      return true;
    },
  });

  function openOrder(id: string) {
    workspace.open({
      id: `order:${id}`,
      page: "order",
      title: tr("Order {0}", [id]),
      params: { orderId: id },
    });
  }

  function openLocked() {
    const opened = workspace.open({ id: "locked", page: "locked" });
    setNotice(opened ? "" : tr("A disabled page does not open."));
  }

  function openNote() {
    const used = workspace.tabs.flatMap((tab) => {
      const match = /^note:(\d+)$/.exec(tab.id);
      return match ? [Number(match[1])] : [];
    });
    const next = (used.length ? Math.max(...used) : 0) + 1;
    workspace.open({
      id: `note:${next}`,
      page: "note",
      title: tr("Note {0}", [String(next)]),
    });
  }

  return (
    <div className="dynamic-tabs-demo">
      <div className="auto-actions">
        <button
          type="button"
          disabled={!workspace.ready}
          onClick={() => openOrder("1001")}
        >
          {tr("Open order {0}", ["1001"])}
        </button>
        <button
          type="button"
          disabled={!workspace.ready}
          onClick={() => openOrder("1002")}
        >
          {tr("Open order {0}", ["1002"])}
        </button>
        <button type="button" disabled={!workspace.ready} onClick={openNote}>
          {tr("New note")}
        </button>
        <button type="button" disabled={!workspace.ready} onClick={openLocked}>
          {tr("Open locked page")}
        </button>
        <label>
          <input
            type="checkbox"
            checked={guardNotes}
            onChange={(event) => setGuardNotes(event.target.checked)}
          />
          {tr("Block closing notes")}
        </label>
      </div>
      {notice ? (
        <p className="auto-muted" role="status">
          {notice}
        </p>
      ) : null}
      {workspace.ready && (
        <AutoTabs
          {...workspace.tabsProps}
          mode={mode}
          size={size}
          density={density}
          actions={
            <>
              <button
                type="button"
                className="auto-tool-btn"
                aria-label={tr("Go to home tab")}
                title={tr("Go to home tab")}
                disabled={!workspace.ready}
                onClick={() => workspace.open({ id: "home", page: "home" })}
              >
                <span className="auto-icon" aria-hidden="true">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 10.5 12 3l9 7.5" />
                    <path d="M5 9.5V21h14V9.5" />
                  </svg>
                </span>
              </button>
              <button
                type="button"
                disabled={!workspace.ready}
                onClick={openNote}
              >
                {tr("New note")}
              </button>
            </>
          }
        />
      )}
    </div>
  );
}
