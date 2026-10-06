import { test, expect, expectTypeOf, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoTabs, type AutoTabsProps } from "../src/components/AutoTabs";

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
