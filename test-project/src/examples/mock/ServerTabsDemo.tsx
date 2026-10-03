import { useEffect, useState } from "react";
import { AutoTabs } from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../../i18n";
import { MockDemo, mockRequest, type MockScenario } from "./MockDemo";

type TabConfig = {
  id: string;
  label: string;
  badge?: number;
  disabled?: boolean;
  visible: boolean;
};
type TabsResponse = { tabs: TabConfig[] };

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
        <button onClick={() => setAttempt((value) => value + 1)}>
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

function TabsView({
  data,
  selected,
  select,
}: {
  data: TabsResponse;
  selected: string;
  select: (id: string) => void;
}) {
  const tr = useDemoText();
  const visible = data.tabs.filter((tab) => tab.visible);
  const active =
    visible.find((tab) => tab.id === selected && !tab.disabled)?.id ??
    visible.find((tab) => !tab.disabled)?.id ??
    "";
  useEffect(() => {
    if (selected !== active) select(active);
  }, [selected, active, select]);
  if (!visible.length) return <p role="status">{tr("mock.tabs.empty")}</p>;
  return (
    <AutoTabs
      value={active ? [active] : []}
      onChange={(path) => select(path[0] ?? "")}
      keepMounted={false}
      items={visible.map((tab) => ({
        ...tab,
        label: tr(tab.label),
        content:
          tab.id === active ? (
            <TabContent key={tab.id} id={tab.id} count={tab.badge} />
          ) : null,
      }))}
    />
  );
}

export function ServerTabsDemo() {
  const [selected, setSelected] = useState("overview");
  return (
    <MockDemo
      title="mock.tabs.title"
      description="mock.tabs.description"
      load={loadTabs}
    >
      {({ data }) => (
        <TabsView data={data} selected={selected} select={setSelected} />
      )}
    </MockDemo>
  );
}
