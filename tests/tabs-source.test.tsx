import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import {
  AutoConfigProvider,
  AutoNavigationProvider,
  AutoTabs,
  createAutoNavigation,
  type AutoTab,
} from "../src/index";
import { resetDevChecks } from "../src/core/dev";

afterEach(() => {
  resetDevChecks();
  vi.restoreAllMocks();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("a source function loads tabs asynchronously and selects them", async () => {
  const u = userEvent.setup();
  const pending = deferred<readonly object[]>();
  render(<AutoTabs source={() => pending.promise} />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  pending.resolve([
    { id: "a", label: "Alpha", content: "Alpha content" },
    { id: "b", label: "Beta", content: "Beta content" },
  ]);
  expect(await screen.findByRole("tab", { name: "Alpha" })).toBeVisible();
  expect(screen.getByText("Alpha content")).toBeVisible();
  await u.click(screen.getByRole("tab", { name: "Beta" }));
  expect(screen.getByText("Beta content")).toBeVisible();
});

test("a registry key source drives route children after it loads", async () => {
  const items: readonly object[] = [
    { id: "general", label: "General", content: "General panel" },
    { id: "security", label: "Security", content: "Security panel" },
  ];
  const nav = createAutoNavigation({ initialPath: "settings" });
  render(
    <AutoConfigProvider
      config={{ tabsSources: { settings: () => Promise.resolve(items) } }}
    >
      <AutoNavigationProvider navigation={nav}>
        <AutoTabs
          route={{ name: "settings", defaultChild: "general" }}
          source="settings"
        />
      </AutoNavigationProvider>
    </AutoConfigProvider>,
  );
  expect(await screen.findByRole("tab", { name: "General" })).toBeVisible();
  expect(screen.getByText("General panel")).toBeVisible();
  await waitFor(() =>
    expect(nav.getState().path.join(":")).toContain("general"),
  );
});

test("an unknown registry key shows RAC-TABS-SOURCE with retry", async () => {
  const u = userEvent.setup();
  render(<AutoTabs source="missing" />);
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("RAC-TABS-SOURCE");
  await u.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("RAC-TABS-SOURCE");
});

test("a rejecting source shows the message and retry recovers", async () => {
  const u = userEvent.setup();
  let fail = true;
  render(
    <AutoTabs
      source={async () => {
        if (fail) throw new Error("network down");
        return [{ id: "a", label: "Alpha", content: "Recovered" }] as const;
      }}
    />,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("network down");
  fail = false;
  await u.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("tab", { name: "Alpha" })).toBeVisible();
});

test("supplying both items and source warns and items win", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const local: readonly AutoTab[] = [
    { id: "local", label: "Local", content: "Local content" },
  ];
  render(<AutoTabs items={local} source={() => Promise.resolve([])} />);
  expect(await screen.findByRole("tab", { name: "Local" })).toBeVisible();
  expect(warn.mock.calls.flat().join("\n")).toContain("RAC-TABS-SOURCE");
});

test("the load aborts when the tabs unmount", async () => {
  let observed: AbortSignal | undefined;
  const { unmount } = render(
    <AutoTabs
      source={({ signal }) => {
        observed = signal;
        return new Promise<readonly object[]>(() => {});
      }}
    />,
  );
  unmount();
  await waitFor(() => expect(observed?.aborted).toBe(true));
});

test("a new source identity refetches", async () => {
  const lists: Record<string, readonly object[]> = {
    one: [{ id: "a", label: "Alpha", content: "Alpha content" }],
    two: [{ id: "b", label: "Beta", content: "Beta content" }],
  };
  let scenario = "one";
  const { rerender } = render(
    <AutoTabs source={() => Promise.resolve(lists[scenario])} />,
  );
  expect(await screen.findByRole("tab", { name: "Alpha" })).toBeVisible();
  scenario = "two";
  rerender(<AutoTabs source={() => Promise.resolve(lists[scenario])} />);
  expect(await screen.findByRole("tab", { name: "Beta" })).toBeVisible();
  expect(screen.queryByRole("tab", { name: "Alpha" })).not.toBeInTheDocument();
});
