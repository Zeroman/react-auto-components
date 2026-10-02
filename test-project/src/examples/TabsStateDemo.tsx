import { useCallback, useEffect, useRef, useState } from "react";
import {
  AutoConfigProvider,
  AutoTabs,
  type AutoTab,
  type ComponentDensity,
  type ComponentSize,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";

function TabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle
        cx="7"
        cy="7"
        r="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CountVisit({ onVisit }: { onVisit: () => void }) {
  useEffect(() => {
    onVisit();
  }, [onVisit]);
  return null;
}

export function TabsStateDemo({
  mode,
  size,
  density,
}: {
  mode: "horizontal" | "vertical";
  size?: ComponentSize;
  density?: ComponentDensity;
}) {
  const tr = useDemoText();
  const [keepMounted, setKeepMounted] = useState(true);
  const [lazy, setLazy] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshed, setRefreshed] = useState(0);
  const [mounts, setMounts] = useState(0);
  const [slips, setSlips] = useState(["1", "2"]);
  const [path, setPath] = useState("draft");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const countVisit = useCallback(() => setMounts((count) => count + 1), []);

  function refresh() {
    window.clearTimeout(timer.current);
    setLoading(true);
    timer.current = window.setTimeout(() => {
      setLoading(false);
      setRefreshed((count) => count + 1);
    }, 700);
  }

  const items: AutoTab[] = [
    {
      id: "draft",
      label: tr("Draft"),
      content: (
        <div className="tab-demo-content">
          <p>{tr("Type here, switch away, then come back.")}</p>
          <input aria-label={tr("Draft")} placeholder={tr("Draft")} />
        </div>
      ),
    },
    {
      id: "lazy",
      label: tr("Lazy"),
      content: (
        <div className="tab-demo-content">
          <CountVisit onVisit={countVisit} />
          <p>{tr("Mounts: {0}", [mounts])}</p>
        </div>
      ),
    },
    {
      id: "refresh",
      label: tr("Updates"),
      loading,
      onRefresh: refresh,
      content: (
        <div className="tab-demo-content">
          <p>
            {refreshed
              ? tr("Last refresh: {0}", [String(refreshed)])
              : tr("Not refreshed yet")}
          </p>
        </div>
      ),
    },
    {
      id: "icon",
      label: tr("Icon"),
      icon: <TabIcon />,
      content: (
        <div className="tab-demo-content">
          <p>{tr("This tab has an icon.")}</p>
        </div>
      ),
    },
    {
      id: "group",
      label: tr("Group"),
      defaultActive: "second",
      children: [
        {
          id: "first",
          label: tr("First"),
          content: <p>{tr("This is the first item, not the default.")}</p>,
        },
        {
          id: "second",
          label: tr("Second"),
          content: <p>{tr("Nested tabs open this one by default.")}</p>,
        },
      ],
    },
    {
      id: "admin",
      label: tr("Admin"),
      roles: ["admin"],
      content: (
        <div className="tab-demo-content">
          <p>{tr("This tab requires the admin role.")}</p>
        </div>
      ),
    },
    {
      id: "secret",
      label: tr("Hidden"),
      hidden: () => !showHidden,
      content: (
        <div className="tab-demo-content">
          <p>{tr("This tab appears only while the switch above is on.")}</p>
        </div>
      ),
    },
    ...slips.map((id) => ({
      id: `slip-${id}`,
      label: tr("Slip {0}", [id]),
      closable: true,
      content: (
        <div className="tab-demo-content">
          <p>{tr("Closing a slip leaves the other tabs in place.")}</p>
        </div>
      ),
    })),
  ];

  return (
    <div className="tabs-state-demo">
      <div className="auto-actions tabs-state-switches">
        <label>
          <input
            type="checkbox"
            checked={keepMounted}
            onChange={(event) => setKeepMounted(event.target.checked)}
          />
          {tr("Keep mounted")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={lazy}
            onChange={(event) => setLazy(event.target.checked)}
          />
          {tr("Mount on first visit")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(event) => setShowHidden(event.target.checked)}
          />
          {tr("Show hidden tab")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={admin}
            onChange={(event) => setAdmin(event.target.checked)}
          />
          {tr("View as admin")}
        </label>
        <span className="auto-muted">{tr("Path: {0}", [path])}</span>
      </div>
      <AutoConfigProvider
        config={{
          canAccess: (item) => !item.roles?.includes("admin") || admin,
        }}
      >
        <AutoTabs
          mode={mode}
          size={size}
          density={density}
          keepMounted={keepMounted}
          lazy={lazy}
          items={items}
          onChange={(next) => setPath(next.join(" / "))}
          onClose={(next) =>
            setSlips((current) =>
              current.filter((id) => `slip-${id}` !== next[0]),
            )
          }
        />
      </AutoConfigProvider>
    </div>
  );
}
