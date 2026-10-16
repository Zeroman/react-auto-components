import { Component, Profiler, type ReactNode } from "react";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AutoTabs, AutoConfigProvider, type TabsSource } from "../src/index";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Bound actual AutoTabs subtree commits: a missing-key loop would blow past 30.
function renderBounded(ui: ReactNode) {
  let commits = 0;
  const view = render(
    <Boundary>
      <Profiler
        id="tabs"
        onRender={() => {
          if (++commits > 30) throw new Error("bounded commits exceeded");
        }}
      >
        {ui}
      </Profiler>
    </Boundary>,
  );
  return { view, rerender: view.rerender, getCommits: () => commits };
}

test("missing source key shows the registered-source error without a commit loop", async () => {
  const { view, getCommits } = renderBounded(<AutoTabs source="missing" />);
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain('source "missing" is not registered');
  await act(async () => {
    await new Promise((r) => setTimeout(r, 120));
  });
  expect(getCommits()).toBeLessThanOrEqual(30);
  view.unmount();
  cleanup();
});

test("changing the missing key updates the error message", async () => {
  const { view, getCommits, rerender } = renderBounded(
    <AutoTabs source="missing-a" />,
  );
  await screen.findByRole("alert");
  rerender(
    <Boundary>
      <Profiler id="tabs" onRender={() => undefined}>
        <AutoTabs source="missing-b" />
      </Profiler>
    </Boundary>,
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      'source "missing-b" is not registered',
    ),
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 120));
  });
  expect(getCommits()).toBeLessThanOrEqual(30);
  view.unmount();
  cleanup();
});

test("late registry registration recovers", async () => {
  const source: TabsSource = async () => [{ id: "a", label: "Alpha" }];
  function Host({ registered }: { registered: boolean }) {
    return (
      <AutoConfigProvider
        config={registered ? { tabsSources: { late: source } } : {}}
      >
        <AutoTabs source="late" />
      </AutoConfigProvider>
    );
  }
  const { view, getCommits, rerender } = renderBounded(
    <Host registered={false} />,
  );
  await screen.findByRole("alert");
  rerender(
    <Boundary>
      <Profiler id="tabs" onRender={() => undefined}>
        <Host registered />
      </Profiler>
    </Boundary>,
  );
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  expect(screen.getByText("Alpha")).toBeVisible();
  await act(async () => {
    await new Promise((r) => setTimeout(r, 120));
  });
  expect(getCommits()).toBeLessThanOrEqual(30);
  view.unmount();
  cleanup();
});

test("retry recovers after a rejection", async () => {
  const source = vi
    .fn()
    .mockRejectedValueOnce(new Error("boom"))
    .mockResolvedValue([{ id: "a", label: "Alpha" }]);
  const { view } = renderBounded(<AutoTabs source={source} />);
  await screen.findByRole("alert");
  const u = userEvent.setup();
  await u.click(screen.getByRole("button"));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  expect(screen.getByText("Alpha")).toBeVisible();
  view.unmount();
  cleanup();
});
