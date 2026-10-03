import { useEffect, useState } from "react";
import {
  AutoMenu,
  type AutoMenuItem,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../../i18n";
import { MockDemo, mockRequest, type MockScenario } from "./MockDemo";

type MenuNode = {
  id: string;
  label: string;
  badge?: number;
  permission?: string;
  disabled?: boolean;
  children?: MenuNode[];
};
type MenuResponse = { permissions: string[]; items: MenuNode[] };

function loadMenu(scenario: MockScenario, signal: AbortSignal) {
  return mockRequest<MenuResponse>(
    {
      permissions:
        scenario === "restricted"
          ? ["workspace.read"]
          : ["workspace.read", "admin.read"],
      items:
        scenario === "empty"
          ? []
          : [
              {
                id: "workspace",
                label: "mock.menu.workspace",
                children: [
                  {
                    id: "inbox",
                    label: "mock.menu.inbox",
                    badge: scenario === "restricted" ? 2 : 7,
                    permission: "workspace.read",
                  },
                  {
                    id: "projects",
                    label: "mock.menu.projects",
                    permission: "workspace.read",
                  },
                ],
              },
              {
                id: "administration",
                label: "mock.menu.administration",
                permission: "admin.read",
                children: [
                  { id: "members", label: "mock.menu.members", badge: 4 },
                  { id: "reports", label: "mock.menu.reports" },
                ],
              },
              {
                id: "maintenance",
                label: "mock.menu.maintenance",
                disabled: true,
              },
            ],
    },
    { signal },
  );
}

function MenuContent({ id, count }: { id: string; count?: number }) {
  const tr = useDemoText();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    data?: { title: string; detail: string; count: number };
    error?: boolean;
  }>({});
  useEffect(() => {
    const controller = new AbortController();
    setState({});
    const payload = {
      inbox: {
        title: "mock.menu.inboxTitle",
        detail: "mock.menu.inboxDetail",
        count: count ?? 7,
      },
      projects: {
        title: "mock.menu.projectsTitle",
        detail: "mock.menu.projectsDetail",
        count: 12,
      },
      members: {
        title: "mock.menu.membersTitle",
        detail: "mock.menu.membersDetail",
        count: 4,
      },
      reports: {
        title: "mock.menu.reportsTitle",
        detail: "mock.menu.reportsDetail",
        count: 6,
      },
    }[id];
    mockRequest(payload, {
      signal: controller.signal,
      delay: 450,
      fail: id === "reports" && attempt === 0,
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
        {tr("mock.menu.contentError")}{" "}
        <button onClick={() => setAttempt((value) => value + 1)}>
          {tr("mock.retry")}
        </button>
      </div>
    );
  if (!state.data) return <p role="status">{tr("mock.menu.loadingContent")}</p>;
  return (
    <article data-testid="server-menu-content">
      <h3>{tr(state.data.title)}</h3>
      <p>{tr(state.data.detail, [state.data.count])}</p>
      <details>
        <summary>{tr("mock.menu.contentPayload")}</summary>
        <pre>{JSON.stringify({ route: id, ...state.data }, null, 2)}</pre>
      </details>
    </article>
  );
}

function MenuView({
  data,
  selected,
  select,
}: {
  data: MenuResponse;
  selected: string;
  select: (id: string) => void;
}) {
  const tr = useDemoText();
  const leafIds: string[] = [];
  const badges = new Map<string, number | undefined>();
  function allowed(
    nodes: MenuNode[],
    ancestorDisabled = false,
  ): AutoMenuItem[] {
    return nodes
      .filter(
        (node) =>
          !node.permission || data.permissions.includes(node.permission),
      )
      .flatMap((node) => {
        const disabled = ancestorDisabled || !!node.disabled;
        const children = node.children
          ? allowed(node.children, disabled)
          : undefined;
        if (children && !children.length) return [];
        if (!children && !disabled) {
          leafIds.push(node.id);
          badges.set(node.id, node.badge);
        }
        return [
          {
            id: node.id,
            label: tr(node.label),
            badge: node.badge,
            disabled,
            children,
          },
        ];
      });
  }
  const items = allowed(data.items);
  const active = leafIds.includes(selected) ? selected : (leafIds[0] ?? "");
  useEffect(() => {
    if (selected !== active) select(active);
  }, [selected, active, select]);
  if (!items.length) return <p role="status">{tr("mock.menu.empty")}</p>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      <AutoMenu
        label={tr("mock.menu.navigation")}
        items={items}
        value={active}
        onChange={select}
        style={{ width: 240, maxWidth: "100%" }}
      />
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        {active ? (
          <MenuContent key={active} id={active} count={badges.get(active)} />
        ) : (
          <p>{tr("mock.menu.empty")}</p>
        )}
      </div>
    </div>
  );
}

export function ServerMenuDemo() {
  const [selected, setSelected] = useState("inbox");
  return (
    <MockDemo
      title="mock.menu.title"
      description="mock.menu.description"
      load={loadMenu}
    >
      {({ data }) => (
        <MenuView data={data} selected={selected} select={setSelected} />
      )}
    </MockDemo>
  );
}
