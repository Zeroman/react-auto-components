import { test, expect, expectTypeOf, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AutoTabs,
  useAutoTabActive,
  type AutoTabsProps,
} from "../src/components/AutoTabs";

expectTypeOf<AutoTabsProps["mode"]>().toEqualTypeOf<
  "horizontal" | "vertical" | undefined
>();
expectTypeOf<AutoTabsProps["tabLayout"]>().toEqualTypeOf<
  "scroll" | "equal" | undefined
>();
test("nested tabs, hidden entries and retained state", async () => {
  const change = vi.fn(),
    u = userEvent.setup();
  render(
    <AutoTabs
      onChange={change}
      items={[
        { id: "a", label: "A", content: <input aria-label="Draft" /> },
        {
          id: "b",
          label: "B",
          children: [
            { id: "b1", label: "Child page", content: "Child content" },
          ],
        },
        { id: "c", label: "Hidden", hidden: true },
      ]}
    />,
  );
  await u.type(screen.getByLabelText("Draft"), "Kept");
  await u.click(screen.getByRole("tab", { name: "B" }));
  expect(screen.getByText("Child content")).toBeVisible();
  await u.click(screen.getByRole("tab", { name: "A" }));
  expect(screen.getByLabelText("Draft")).toHaveValue("Kept");
  expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  expect(change).toHaveBeenCalled();
});

test("tab overflow shows scroll buttons and handles boundary scrolling and scrollIntoView", async () => {
  const u = userEvent.setup();
  const scrollIntoViewMock = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
  const scrollByMock = vi.fn();
  window.HTMLElement.prototype.scrollBy = scrollByMock;

  const items = Array.from({ length: 10 }, (_, i) => ({
    id: `tab-${i}`,
    label: `Tab ${i}`,
    content: `Content ${i}`,
  }));

  const { container } = render(
    <AutoTabs items={items} defaultValue={["tab-0"]} />,
  );

  const nav = container.querySelector(".auto-tabs-nav") as HTMLElement;
  const list = container.querySelector(".auto-tab-list") as HTMLElement;
  expect(nav).toBeInTheDocument();
  expect(list).toBeInTheDocument();

  // Initially without overflow
  expect(
    container.querySelector(".auto-tabs-scroll-btn"),
  ).not.toBeInTheDocument();

  // Mock overflow dimensions: list scrollWidth > nav clientWidth + 1
  Object.defineProperty(nav, "clientWidth", {
    configurable: true,
    value: 300,
  });
  Object.defineProperty(list, "clientWidth", {
    configurable: true,
    value: 300,
  });
  Object.defineProperty(list, "scrollWidth", {
    configurable: true,
    value: 600,
  });
  Object.defineProperty(list, "scrollLeft", {
    configurable: true,
    writable: true,
    value: 0,
  });

  // Trigger resize to recalculate overflow
  fireEvent(window, new Event("resize"));

  // Check scroll buttons appear
  const prevBtn = await screen.findByRole("button", {
    name: "Scroll tabs left",
  });
  const nextBtn = await screen.findByRole("button", {
    name: "Scroll tabs right",
  });
  expect(prevBtn).toBeInTheDocument();
  expect(nextBtn).toBeInTheDocument();

  // At left boundary: prev is disabled, next is enabled
  expect(prevBtn).toBeDisabled();
  expect(nextBtn).not.toBeDisabled();

  // Click next button -> calls scrollBy to the right
  await u.click(nextBtn);
  expect(scrollByMock).toHaveBeenCalledWith({
    left: 225, // 300 * 0.75
    behavior: "smooth",
  });

  // Simulate scrolled to middle: scrollLeft = 100
  list.scrollLeft = 100;
  fireEvent.scroll(list);
  expect(prevBtn).not.toBeDisabled();
  expect(nextBtn).not.toBeDisabled();

  // Click prev button -> calls scrollBy to the left
  await u.click(prevBtn);
  expect(scrollByMock).toHaveBeenCalledWith({
    left: -225,
    behavior: "smooth",
  });

  // Simulate scrolled to end: scrollLeft = 300 (300 + 300 = 600)
  list.scrollLeft = 300;
  fireEvent.scroll(list);
  expect(prevBtn).not.toBeDisabled();
  expect(nextBtn).toBeDisabled();

  // Selecting a tab out of view calls scrollIntoView
  const tab8 = screen.getByRole("tab", { name: "Tab 8" });
  vi.spyOn(list, "getBoundingClientRect").mockReturnValue({
    left: 0,
    right: 300,
    top: 0,
    bottom: 40,
    width: 300,
    height: 40,
    x: 0,
    y: 0,
    toJSON: () => {},
  });
  vi.spyOn(tab8, "getBoundingClientRect").mockReturnValue({
    left: 450,
    right: 520,
    top: 0,
    bottom: 40,
    width: 70,
    height: 40,
    x: 450,
    y: 0,
    toJSON: () => {},
  });
  await u.click(tab8);
  expect(scrollIntoViewMock).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "nearest",
    inline: "nearest",
  });
});

test("vertical mode does not show overflow scroll buttons", async () => {
  const items = Array.from({ length: 10 }, (_, i) => ({
    id: `tab-${i}`,
    label: `Tab ${i}`,
  }));

  const { container } = render(
    <AutoTabs items={items} mode="vertical" defaultValue={["tab-0"]} />,
  );

  const nav = container.querySelector(".auto-tabs-nav") as HTMLElement;
  const list = container.querySelector(".auto-tab-list") as HTMLElement;

  Object.defineProperty(nav, "clientWidth", { configurable: true, value: 300 });
  Object.defineProperty(list, "clientWidth", {
    configurable: true,
    value: 300,
  });
  Object.defineProperty(list, "scrollWidth", {
    configurable: true,
    value: 600,
  });

  fireEvent(window, new Event("resize"));

  expect(
    container.querySelector(".auto-tabs-scroll-btn"),
  ).not.toBeInTheDocument();
});

test("renders actions and extra in auto-tabs-extra container", async () => {
  const onSave = vi.fn();
  const u = userEvent.setup();

  const { container } = render(
    <AutoTabs
      items={[
        { id: "one", label: "One", content: "Panel 1" },
        { id: "two", label: "Two", content: "Panel 2" },
      ]}
      actions={
        <button type="button" className="auto-primary" onClick={onSave}>
          Save
        </button>
      }
      extra={<span data-testid="extra-status">Online</span>}
    />,
  );

  const extraContainer = container.querySelector(".auto-tabs-extra");
  expect(extraContainer).toBeInTheDocument();
  expect(extraContainer).toHaveClass("auto-actions");

  const saveBtn = screen.getByRole("button", { name: "Save" });
  expect(saveBtn).toBeInTheDocument();
  expect(saveBtn).toHaveClass("auto-primary");
  await u.click(saveBtn);
  expect(onSave).toHaveBeenCalled();

  expect(screen.getByTestId("extra-status")).toHaveTextContent("Online");
});
test("tab right-click menu lists actions and reports the tab", async () => {
  const u = userEvent.setup();
  const copy = vi.fn();
  const archive = vi.fn();
  render(
    <AutoTabs
      items={[
        { id: "a", label: "Alpha", content: "A" },
        { id: "b", label: "Beta", content: "B" },
      ]}
      tabActions={[
        { id: "copy", label: "Copy tab name", onClick: copy },
        {
          id: "hidden",
          label: "Never shown",
          hidden: () => true,
          onClick: vi.fn(),
        },
        {
          id: "archive",
          label: "Archive tab",
          danger: true,
          separator: true,
          disabled: (tab) => tab.id === "b",
          onClick: archive,
        },
      ]}
    />,
  );
  await fireEvent.contextMenu(screen.getByRole("tab", { name: "Alpha" }));
  expect(await screen.findByRole("menu")).toBeVisible();
  expect(screen.getByRole("menuitem", { name: "Copy tab name" })).toBeVisible();
  expect(screen.queryByRole("menuitem", { name: "Never shown" })).toBeNull();
  await u.click(screen.getByRole("menuitem", { name: "Archive tab" }));
  expect(archive).toHaveBeenCalledWith(
    expect.objectContaining({ id: "a", label: "Alpha" }),
  );
  expect(copy).not.toHaveBeenCalled();
});

test("useAutoTabActive reports tab visibility correctly", async () => {
  const u = userEvent.setup();
  const activeHistory: boolean[] = [];

  function Watcher() {
    const active = useAutoTabActive();
    activeHistory.push(active);
    return <span>{active ? "active" : "inactive"}</span>;
  }

  render(
    <AutoTabs
      items={[
        { id: "tab-1", label: "Tab 1", content: <Watcher /> },
        { id: "tab-2", label: "Tab 2", content: "Tab 2 content" },
      ]}
    />,
  );

  expect(activeHistory[activeHistory.length - 1]).toBe(true);

  await u.click(screen.getByRole("tab", { name: "Tab 2" }));
  expect(activeHistory[activeHistory.length - 1]).toBe(false);

  await u.click(screen.getByRole("tab", { name: "Tab 1" }));
  expect(activeHistory[activeHistory.length - 1]).toBe(true);
});

test("nested tabs correctly inherit parent active context and do not falsely report active when parent is hidden", async () => {
  const u = userEvent.setup();
  const childHistory: boolean[] = [];

  function ChildWatcher() {
    const active = useAutoTabActive();
    childHistory.push(active);
    return <span>Child active: {String(active)}</span>;
  }

  render(
    <AutoTabs
      items={[
        {
          id: "parent-1",
          label: "Parent 1",
          children: [
            {
              id: "child-1",
              label: "Child 1",
              content: <ChildWatcher />,
            },
            {
              id: "child-2",
              label: "Child 2",
              content: "Child 2 content",
            },
          ],
        },
        {
          id: "parent-2",
          label: "Parent 2",
          content: "Parent 2 content",
        },
      ]}
    />,
  );

  // Initially: Parent 1 is active, Child 1 is active -> ChildWatcher reports true
  expect(childHistory[childHistory.length - 1]).toBe(true);

  // Switch to Parent 2 -> Parent 1 is hidden, so Child 1 must report false (not ghost active)
  await u.click(screen.getByRole("tab", { name: "Parent 2" }));
  expect(childHistory[childHistory.length - 1]).toBe(false);

  // Switch back to Parent 1 -> Parent 1 is visible again, Child 1 reports true
  await u.click(screen.getByRole("tab", { name: "Parent 1" }));
  expect(childHistory[childHistory.length - 1]).toBe(true);
});

test("AutoTabs nested inside another panel's content reports inactive when the outer panel hides", async () => {
  const u = userEvent.setup();
  const innerHistory: boolean[] = [];

  function InnerWatcher() {
    const active = useAutoTabActive();
    innerHistory.push(active);
    return <span>Inner active: {String(active)}</span>;
  }

  render(
    <AutoTabs
      items={[
        {
          id: "outer-1",
          label: "Outer 1",
          content: (
            <AutoTabs
              items={[
                { id: "inner-1", label: "Inner 1", content: <InnerWatcher /> },
                { id: "inner-2", label: "Inner 2", content: "Inner 2" },
              ]}
            />
          ),
        },
        { id: "outer-2", label: "Outer 2", content: "Outer 2 content" },
      ]}
    />,
  );

  expect(innerHistory[innerHistory.length - 1]).toBe(true);

  // Hide the whole outer panel: the inner instance must not report its own
  // child as active just because that child is active within the inner tabs.
  await u.click(screen.getByRole("tab", { name: "Outer 2" }));
  expect(innerHistory[innerHistory.length - 1]).toBe(false);

  await u.click(screen.getByRole("tab", { name: "Outer 1" }));
  expect(innerHistory[innerHistory.length - 1]).toBe(true);
});

test("tabs retain drafts but do not restore historical focus or interpret autofocus markers", async () => {
  const u = userEvent.setup();
  render(
    <AutoTabs
      items={[
        {
          id: "a",
          label: "A",
          content: <input data-autofocus aria-label="Draft entry" />,
        },
        { id: "b", label: "B", content: <input aria-label="Other page" /> },
      ]}
    />,
  );
  const draft = screen.getByLabelText("Draft entry");
  expect(draft).not.toHaveFocus();
  await u.type(draft, "Saved draft");
  await u.click(screen.getByRole("tab", { name: "B" }));
  await u.click(screen.getByRole("tab", { name: "A" }));
  expect(draft).toHaveValue("Saved draft");
  expect(screen.getByRole("tab", { name: "A" })).toHaveFocus();
});

test.each([
  ["horizontal", "ArrowRight", "ArrowLeft"],
  ["vertical", "ArrowDown", "ArrowUp"],
] as const)(
  "%s arrow navigation does not activate panels",
  async (mode, next, previous) => {
    const u = userEvent.setup();
    const change = vi.fn();
    render(
      <AutoTabs
        mode={mode}
        onChange={change}
        items={[
          { id: "a", label: "A", content: "Panel A" },
          { id: "b", label: "B", content: "Panel B" },
        ]}
      />,
    );
    const a = screen.getByRole("tab", { name: "A" });
    const b = screen.getByRole("tab", { name: "B" });
    a.focus();
    await u.keyboard(`{${next}}`);
    await waitFor(() => expect(b).toHaveFocus());
    expect(screen.getByText("Panel A")).toBeVisible();
    expect(screen.getByText("Panel B")).not.toBeVisible();
    expect(change).not.toHaveBeenCalled();
    await u.keyboard("{Enter}");
    expect(screen.getByText("Panel B")).toBeVisible();
    change.mockClear();
    await u.keyboard(`{${previous}}`);
    await waitFor(() => expect(a).toHaveFocus());
    expect(screen.getByText("Panel B")).toBeVisible();
    expect(change).not.toHaveBeenCalled();
    await u.keyboard(" ");
    expect(screen.getByText("Panel A")).toBeVisible();
  },
);

test("equal tab layout marks the bar, titles labels and skips vertical", () => {
  const items = [
    { id: "a", label: "A short label", content: "Panel A" },
    { id: "b", label: "A much longer label that would truncate", content: "Panel B" },
  ];
  const { container, rerender } = render(<AutoTabs items={items} />);
  const root = () => container.querySelector<HTMLElement>(".auto-tabs")!;
  expect(root()).toHaveAttribute("data-tab-layout", "scroll");
  expect(screen.getByRole("tab", { name: /longer label/ })).not.toHaveAttribute(
    "title",
  );

  rerender(<AutoTabs items={items} tabLayout="equal" />);
  expect(root()).toHaveAttribute("data-tab-layout", "equal");
  expect(screen.getByRole("tab", { name: /longer label/ })).toHaveAttribute(
    "title",
    "A much longer label that would truncate",
  );

  rerender(<AutoTabs items={items} tabLayout="equal" mode="vertical" />);
  expect(root()).not.toHaveAttribute("data-tab-layout");
});
