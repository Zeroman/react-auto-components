import { useCallback, useEffect, useState } from "react";
import { AutoTabs, type AutoTab } from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../../i18n";
import { mockRequest, type MockScenario } from "./MockDemo";
import "./mock.css";

type TabConfig = {
  id: string;
  label: string;
  badge?: number;
  disabled?: boolean;
  visible: boolean;
};

function loadTabs(scenario: MockScenario, signal: AbortSignal) {
  const tabs: TabConfig[] =
    scenario === "empty"
      ? []
      : scenario === "restricted"
        ? [
            {
              id: "activity",
              label: "mock.tabs.activity",
              badge: 2,
              visible: true,
            },
            { id: "overview", label: "mock.tabs.overview", visible: true },
            { id: "billing", label: "mock.tabs.billing", visible: false },
            {
              id: "archive",
              label: "mock.tabs.archive",
              disabled: true,
              visible: true,
            },
          ]
        : [
            { id: "overview", label: "mock.tabs.overview", visible: true },
            {
              id: "billing",
              label: "mock.tabs.billing",
              badge: 3,
              visible: true,
            },
            {
              id: "activity",
              label: "mock.tabs.activity",
              badge: 8,
              visible: true,
            },
            {
              id: "archive",
              label: "mock.tabs.archive",
              disabled: true,
              visible: true,
            },
          ];
  return mockRequest({ tabs }, { signal });
}

function TabContent({ id, count }: { id: string; count?: number }) {
  const tr = useDemoText();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    data?: { title: string; detail: string; count: number };
    error?: boolean;
  }>({});
  useEffect(() => {
    const controller = new AbortController();
    setState({});
    const content = {
      overview: {
        title: "mock.tabs.overviewTitle",
        detail: "mock.tabs.overviewDetail",
        count: 12,
      },
      billing: {
        title: "mock.tabs.billingTitle",
        detail: "mock.tabs.billingDetail",
        count: 3,
      },
      activity: {
        title: "mock.tabs.activityTitle",
        detail: "mock.tabs.activityDetail",
        count: count ?? 8,
      },
    }[id];
    mockRequest(content, {
      signal: controller.signal,
      delay: 450,
      fail: id === "activity" && attempt === 0,
    }).then(
      (data) => {
        if (!controller.signal.aborted) setState({ data });
      },
      () => {
        if (!controller.signal.aborted) setState({ error: true });
      },
    );
    return () => controller.abort();
  }, [id, count, attempt]);
  if (state.error)
    return (
      <div role="alert">
        {tr("mock.tabs.contentError")}{" "}
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          {tr("mock.retry")}
        </button>
      </div>
    );
  if (!state.data) return <p role="status">{tr("mock.tabs.loadingContent")}</p>;
  return (
    <article data-testid="server-tab-content">
      <h3>{tr(state.data.title)}</h3>
      <p>{tr(state.data.detail, [state.data.count])}</p>
      <details>
        <summary>{tr("mock.tabs.contentPayload")}</summary>
        <pre>{JSON.stringify({ tabId: id, ...state.data }, null, 2)}</pre>
      </details>
    </article>
  );
}

export function ServerTabsDemo() {
  const tr = useDemoText();
  const [scenario, setScenario] = useState<MockScenario>("normal");
  const source = useCallback(
    ({ signal }: { signal: AbortSignal }) => {
      if (scenario === "error")
        return Promise.reject(new Error(tr("mock.requestFailed")));
      return loadTabs(scenario, signal).then((data): readonly AutoTab[] =>
        data.tabs.map((tab) => ({
          id: tab.id,
          label: tr(tab.label),
          badge: tab.badge,
          disabled: tab.disabled,
          hidden: !tab.visible,
          content: <TabContent id={tab.id} count={tab.badge} />,
        })),
      );
    },
    [tr, scenario],
  );
  return (
    <section
      className="card auto-root mock-demo"
      data-testid="server-driven-demo"
    >
      <h2>{tr("mock.tabs.title")}</h2>
      <p className="muted">{tr("mock.tabs.description")}</p>
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
        <span className="auto-badge">Mock</span>
      </div>
      <div className="mock-content">
        <AutoTabs source={source} keepMounted={false} />
      </div>
    </section>
  );
}
