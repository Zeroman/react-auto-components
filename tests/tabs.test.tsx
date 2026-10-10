import { useState } from "react";
import { test, expect, expectTypeOf, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AutoTabs,
  useAutoTabActive,
  type AutoTabsProps,
} from "../src/components/AutoTabs";

expectTypeOf<AutoTabsProps["mode"]>().toEqualTypeOf<
  "horizontal" | "vertical" | undefined
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
  expect(
    screen.getByRole("menuitem", { name: "Copy tab name" }),
  ).toBeVisible();
  expect(screen.queryByRole("menuitem", { name: "Never shown" })).toBeNull();
  await u.click(screen.getByRole("menuitem", { name: "Archive tab" }));
  expect(archive).toHaveBeenCalledWith(
    expect.objectContaining({ id: "a", label: "Alpha" }),
  );
  expect(copy).not.toHaveBeenCalled();
});

test("restoreFocus: switches back to tab and restores focus to last active element", async () => {
  const u = userEvent.setup();
  render(
    <AutoTabs
      items={[
        {
          id: "tab-a",
          label: "Tab A",
          content: (
            <div>
              <input aria-label="Input A1" />
              <input aria-label="Input A2" />
            </div>
          ),
        },
        {
          id: "tab-b",
          label: "Tab B",
          content: <input aria-label="Input B" />,
        },
      ]}
    />,
  );

  const inputA2 = screen.getByLabelText("Input A2");
  await u.click(inputA2);
  expect(inputA2).toHaveFocus();

  // Switch to Tab B
  await u.click(screen.getByRole("tab", { name: "Tab B" }));
  expect(screen.getByLabelText("Input B")).toBeVisible();

  // Switch back to Tab A -> focus restores to Input A2
  await u.click(screen.getByRole("tab", { name: "Tab A" }));
  expect(inputA2).toHaveFocus();
});

test("restoreFocus: false disables focus restoration when switching back", async () => {
  const u = userEvent.setup();
  render(
    <AutoTabs
      restoreFocus={false}
      items={[
        {
          id: "tab-a",
          label: "Tab A",
          content: <input aria-label="Input A" />,
        },
        {
          id: "tab-b",
          label: "Tab B",
          content: <p>Panel B</p>,
        },
      ]}
    />,
  );

  const inputA = screen.getByLabelText("Input A");
  await u.click(inputA);
  expect(inputA).toHaveFocus();

  await u.click(screen.getByRole("tab", { name: "Tab B" }));
  await u.click(screen.getByRole("tab", { name: "Tab A" }));

  // Focus remains on Tab A trigger button rather than returning to Input A
  expect(screen.getByRole("tab", { name: "Tab A" })).toHaveFocus();
});

test("data-autofocus and focusTarget automatically focus target element", async () => {
  const u = userEvent.setup();
  render(
    <AutoTabs
      items={[
        {
          id: "tab-1",
          label: "Tab 1",
          content: <p>First page</p>,
        },
        {
          id: "tab-autofocus",
          label: "Tab Autofocus",
          content: (
            <div>
              <input aria-label="First input" />
              <input aria-label="Marked autofocus" data-autofocus />
            </div>
          ),
        },
        {
          id: "tab-target-selector",
          label: "Tab Selector",
          focusTarget: "#custom-target",
          content: (
            <div>
              <input aria-label="Ignored input" />
              <textarea id="custom-target" aria-label="Custom target" />
            </div>
          ),
        },
      ]}
    />,
  );

  // Switch to Tab Autofocus -> [data-autofocus] element gets focused
  await u.click(screen.getByRole("tab", { name: "Tab Autofocus" }));
  expect(screen.getByLabelText("Marked autofocus")).toHaveFocus();

  // Switch to Tab Selector -> #custom-target gets focused
  await u.click(screen.getByRole("tab", { name: "Tab Selector" }));
  expect(screen.getByLabelText("Custom target")).toHaveFocus();
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

test("arrow key navigation retains focus on tab trigger with pointer-only mode", async () => {
  const u = userEvent.setup();
  render(
    <AutoTabs
      autoFocusMode="pointer-only"
      items={[
        {
          id: "tab-1",
          label: "Tab 1",
          content: <input aria-label="Input 1" />,
        },
        {
          id: "tab-2",
          label: "Tab 2",
          focusTarget: true,
          content: <input aria-label="Input 2" />,
        },
      ]}
    />,
  );

  // Focus the first tab trigger
  const tab1 = screen.getByRole("tab", { name: "Tab 1" });
  tab1.focus();
  expect(tab1).toHaveFocus();

  // Navigate to Tab 2 via ArrowRight
  await u.keyboard("{ArrowRight}");
  const tab2 = screen.getByRole("tab", { name: "Tab 2" });

  // Focus remains on Tab 2 trigger, not stolen by Input 2
  expect(tab2).toHaveFocus();
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

test("parent re-render does not repeatedly steal focus from current active element", async () => {
  const u = userEvent.setup();

  function ParentWithState() {
    const [, setTick] = useState(0);
    return (
      <div>
        <button type="button" onClick={() => setTick((t) => t + 1)}>
          Re-render
        </button>
        <AutoTabs
          items={[
            {
              id: "tab-1",
              label: "Tab 1",
              // Inline focusTarget function that changes reference on every render
              focusTarget: () => document.getElementById("first-input"),
              content: (
                <div>
                  <input id="first-input" aria-label="First Input" />
                  <input id="second-input" aria-label="Second Input" />
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  }

  render(<ParentWithState />);

  const firstInput = screen.getByLabelText("First Input");
  const secondInput = screen.getByLabelText("Second Input");
  const rerenderBtn = screen.getByRole("button", { name: "Re-render" });

  // Initially firstInput is focused via focusTarget
  expect(firstInput).toHaveFocus();

  // User manually moves focus to secondInput
  secondInput.focus();
  expect(secondInput).toHaveFocus();

  // Trigger parent re-render (which creates new inline focusTarget function)
  await u.click(rerenderBtn);

  // Focus should NOT be stolen back to firstInput
  expect(firstInput).not.toHaveFocus();
});

test("programmatic tab switch focuses properly even after keyboard navigation", async () => {
  const u = userEvent.setup();

  function ControlledTabs() {
    const [tab, setTab] = useState(["tab-1"]);
    return (
      <div>
        <button type="button" onClick={() => setTab(["tab-3"])}>
          Go Tab 3
        </button>
        <AutoTabs
          value={tab}
          onChange={(p) => setTab([...p])}
          autoFocusMode="pointer-only"
          items={[
            {
              id: "tab-1",
              label: "Tab 1",
              content: <input aria-label="Input 1" />,
            },
            {
              id: "tab-2",
              label: "Tab 2",
              focusTarget: true,
              content: <input aria-label="Input 2" />,
            },
            {
              id: "tab-3",
              label: "Tab 3",
              focusTarget: true,
              content: <input aria-label="Input 3" />,
            },
          ]}
        />
      </div>
    );
  }

  render(<ControlledTabs />);

  // 1. Focus tab-1 trigger and navigate to tab-2 via keyboard ArrowRight
  const tab1 = screen.getByRole("tab", { name: "Tab 1" });
  tab1.focus();
  await u.keyboard("{ArrowRight}");

  const tab2 = screen.getByRole("tab", { name: "Tab 2" });
  expect(tab2).toHaveFocus();

  // 2. Click the external button to programmatically switch to Tab 3
  const goTab3Btn = screen.getByRole("button", { name: "Go Tab 3" });
  await u.click(goTab3Btn);

  // 3. Tab 3 should autofocus its input (not blocked by previous keyboard arrow state)
  const input3 = screen.getByLabelText("Input 3");
  expect(input3).toHaveFocus();
});

test("tryFocus falls back to autofocus or focusTarget when previous focus element cannot receive focus", async () => {
  const u = userEvent.setup();

  function DynamicFocusableTab() {
    const [disabled, setDisabled] = useState(false);
    return (
      <div>
        <button type="button" onClick={() => setDisabled(true)}>
          Disable First
        </button>
        <AutoTabs
          items={[
            {
              id: "tab-1",
              label: "Tab 1",
              content: (
                <div>
                  <input
                    aria-label="Volatile input"
                    disabled={disabled}
                  />
                  <input
                    data-autofocus
                    aria-label="Fallback autofocus"
                  />
                </div>
              ),
            },
            {
              id: "tab-2",
              label: "Tab 2",
              content: "Tab 2 content",
            },
          ]}
        />
      </div>
    );
  }

  render(<DynamicFocusableTab />);

  const volatileInput = screen.getByLabelText("Volatile input");
  const fallbackAutofocus = screen.getByLabelText("Fallback autofocus");
  const disableBtn = screen.getByRole("button", { name: "Disable First" });

  // Focus the volatile input
  volatileInput.focus();
  expect(volatileInput).toHaveFocus();

  // Disable the volatile input
  await u.click(disableBtn);
  expect(volatileInput).toBeDisabled();

  // Switch to Tab 2
  await u.click(screen.getByRole("tab", { name: "Tab 2" }));

  // Switch back to Tab 1
  await u.click(screen.getByRole("tab", { name: "Tab 1" }));

  // Since volatile input is disabled and cannot receive focus, tryFocus verifies
  // and falls back to the data-autofocus element
  expect(fallbackAutofocus).toHaveFocus();
});

test("tryFocus falls back when the remembered element sits in a disabled fieldset", async () => {
  const u = userEvent.setup();

  function FieldsetTab() {
    const [locked, setLocked] = useState(false);
    return (
      <div>
        <button type="button" onClick={() => setLocked(true)}>
          Lock section
        </button>
        <AutoTabs
          items={[
            {
              id: "tab-1",
              label: "Tab 1",
              content: (
                <div>
                  <fieldset disabled={locked}>
                    <input aria-label="Locked input" />
                  </fieldset>
                  <input data-autofocus aria-label="Fallback autofocus" />
                </div>
              ),
            },
            { id: "tab-2", label: "Tab 2", content: "Tab 2 content" },
          ]}
        />
      </div>
    );
  }

  render(<FieldsetTab />);

  // Remember the input as last-focused, then make it unfocusable via its fieldset
  const lockedInput = screen.getByLabelText("Locked input");
  lockedInput.focus();
  expect(lockedInput).toHaveFocus();
  await u.click(screen.getByRole("button", { name: "Lock section" }));

  await u.click(screen.getByRole("tab", { name: "Tab 2" }));
  await u.click(screen.getByRole("tab", { name: "Tab 1" }));

  // The remembered element is connected, inside the panel, and not itself
  // disabled — the browser just refuses to focus it. tryFocus must verify
  // the focus actually landed and fall back to the data-autofocus element.
  expect(screen.getByLabelText("Fallback autofocus")).toHaveFocus();
});

test("programmatic switch still focuses after a keypress that activates nothing", async () => {
  const u = userEvent.setup();

  function ControlledTabs() {
    const [tab, setTab] = useState(["tab-1"]);
    return (
      <div>
        <button type="button" onClick={() => setTab(["tab-2"])}>
          Go Tab 2
        </button>
        <AutoTabs
          value={tab}
          onChange={(p) => setTab([...p])}
          autoFocusMode="pointer-only"
          items={[
            {
              id: "tab-1",
              label: "Tab 1",
              focusTarget: true,
              content: <input aria-label="Input 1" />,
            },
            {
              id: "tab-2",
              label: "Tab 2",
              focusTarget: true,
              content: <input aria-label="Input 2" />,
            },
          ]}
        />
      </div>
    );
  }

  render(<ControlledTabs />);

  // Flush the mount-time focus timer so it cannot interfere below.
  await new Promise((r) => setTimeout(r, 0));

  // Focus the already-active FIRST trigger and press Home: radix does not
  // move focus and nothing activates, so no render consumes the "keyboard"
  // activation marker. The keyup must still clear it, otherwise the marker
  // leaks into the next programmatic switch and suppresses its autofocus.
  const tab1Trigger = screen.getByRole("tab", { name: "Tab 1" });
  tab1Trigger.focus();
  expect(tab1Trigger).toHaveFocus();
  await u.keyboard("{Home}");
  expect(tab1Trigger).toHaveFocus();

  await u.click(screen.getByRole("button", { name: "Go Tab 2" }));

  expect(screen.getByLabelText("Input 2")).toHaveFocus();
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


