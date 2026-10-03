import { test, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { AutoConfigProvider } from "../src/core/AutoConfigProvider";
import { AutoTabs } from "../src/components/AutoTabs";
import { AutoForm } from "../src/components/AutoForm";
import { AutoSearch } from "../src/components/AutoSearch";
import { AutoTable } from "../src/components/AutoTable";
import { AutoMenu } from "../src/components/AutoMenu";
import { AutoDialog } from "../src/components/AutoDialog";
import { AutoTip } from "../src/components/AutoTip";
import { createRef, useState } from "react";

type TipProps = { content: ReactNode; children: ReactElement };
function GlobalTip({ content, children }: TipProps) {
  return (
    <>
      {children}
      <aside aria-label="Global help">{content}</aside>
    </>
  );
}
function LocalTip({ content, children }: TipProps) {
  return (
    <>
      {children}
      <aside aria-label="Local help">{content}</aside>
    </>
  );
}
const items = [
  { id: "a", label: "A", tip: <b>Tab help</b>, content: "Page A" },
];

test("tab tips float on hover without changing selection or adding a trigger", async () => {
  const u = userEvent.setup();
  render(<AutoTabs items={items} />);
  const tab = screen.getByRole("tab", { name: "A" });
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  await u.hover(tab);
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Tab help");
  expect(tab).toHaveAttribute("aria-selected", "true");
  expect(screen.getAllByRole("tab")).toHaveLength(1);
  await u.unhover(tab);
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
});

test("focused tab help is described accessibly and Escape dismisses it", async () => {
  const u = userEvent.setup();
  render(<AutoTabs items={items} />);
  await u.tab();
  const tip = await screen.findByRole("tooltip");
  expect(screen.getByRole("tab")).toHaveAttribute("aria-describedby", tip.id);
  await u.keyboard("{Escape}");
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  expect(screen.getByRole("tab")).toHaveFocus();
});

test("local tip component overrides global and reaches nested tabs", () => {
  render(
    <AutoConfigProvider config={{ tipComponent: GlobalTip }}>
      <AutoTabs
        tipComponent={LocalTip}
        items={[{ id: "parent", label: "Parent", children: items }]}
      />
    </AutoConfigProvider>,
  );
  expect(
    screen.getByRole("complementary", { name: "Local help" }),
  ).toHaveTextContent("Tab help");
  expect(
    screen.queryByRole("complementary", { name: "Global help" }),
  ).not.toBeInTheDocument();
});

test("global tip component is inherited from a nested provider", () => {
  render(
    <AutoConfigProvider config={{ tipComponent: GlobalTip }}>
      <AutoConfigProvider config={{ size: "small" }}>
        <AutoTabs items={items} />
      </AutoConfigProvider>
    </AutoConfigProvider>,
  );
  expect(
    screen.getByRole("complementary", { name: "Global help" }),
  ).toHaveTextContent("Tab help");
});

test("field help floats separately from its label and display fields remain content", async () => {
  const u = userEvent.setup();
  render(
    <AutoForm
      fields={[
        { name: "name", label: "Name", tip: "Field help" },
        { type: "tip", tip: "Visible notice" },
        { type: "append", tip: <strong>Extra content</strong> },
      ]}
      actions={false}
    />,
  );
  expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
  expect(screen.getByText("Field help")).not.toBeVisible();
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  expect(screen.getByText("Visible notice")).toBeVisible();
  expect(screen.getByText("Extra content")).toBeVisible();
  await u.hover(
    screen
      .getByRole("textbox", { name: "Name" })
      .closest(".auto-field")!
      .querySelector("label")!,
  );
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Field help");
});

test("search passes its local tip component to fields", () => {
  render(
    <AutoConfigProvider config={{ tipComponent: GlobalTip }}>
      <AutoSearch
        tipComponent={LocalTip}
        fields={[{ name: "name", tip: "Search help" }]}
        onSearch={() => {}}
      />
    </AutoConfigProvider>,
  );
  expect(
    screen.getByRole("complementary", { name: "Local help" }),
  ).toHaveTextContent("Search help");
});

test("table shares its local tip component with column headers and search fields", () => {
  render(
    <AutoConfigProvider config={{ tipComponent: GlobalTip }}>
      <AutoTable
        id="tips"
        data={[{ id: "1", name: "Alice" }]}
        rowKey="id"
        tipComponent={LocalTip}
        columns={[{ key: "name", label: "Name", tip: "Column help" }]}
        searchFields={[{ name: "name", tip: "Search help" }]}
      />
    </AutoConfigProvider>,
  );
  expect(
    screen
      .getAllByRole("complementary", { name: "Local help" })
      .map((el) => el.textContent),
  ).toEqual(["Search help", "Column help"]);
});

test("dialog passes its local tip component to its form", () => {
  render(
    <AutoDialog
      open
      onOpenChange={() => {}}
      title="Edit"
      tipComponent={LocalTip}
      fields={[{ name: "name", tip: "Dialog help" }]}
    />,
  );
  expect(
    screen.getByRole("complementary", { name: "Local help" }),
  ).toHaveTextContent("Dialog help");
});

test("nested menu tips use the local component and keep navigation clickable", async () => {
  const u = userEvent.setup();
  render(
    <AutoMenu
      tipComponent={LocalTip}
      items={[
        {
          id: "p",
          label: "Group",
          children: [{ id: "a", label: "Page", tip: "Menu help" }],
        },
      ]}
    />,
  );
  expect(
    screen.getByRole("complementary", { name: "Local help" }),
  ).toHaveTextContent("Menu help");
  await u.click(screen.getByRole("button", { name: "Page" }));
  expect(screen.getByRole("button", { name: "Page" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("tips preserve trigger refs, existing descriptions and click handlers", async () => {
  const u = userEvent.setup();
  const ref = createRef<HTMLButtonElement>();
  let clicks = 0;
  render(
    <>
      <p id="existing-help">Existing help</p>
      <AutoTip content="More help">
        <button
          ref={ref}
          aria-describedby="existing-help"
          onClick={() => clicks++}
        >
          Action
        </button>
      </AutoTip>
    </>,
  );
  const button = screen.getByRole("button", { name: "Action" });
  expect(ref.current).toBe(button);
  await u.hover(button);
  const tip = await screen.findByRole("tooltip");
  expect(button.getAttribute("aria-describedby")?.split(" ")).toEqual([
    "existing-help",
    tip.id,
  ]);
  await u.click(button);
  expect(clicks).toBe(1);
});

test("empty tips leave triggers unchanged even with a custom global component", () => {
  render(
    <AutoConfigProvider config={{ tipComponent: GlobalTip }}>
      <AutoTip content="">
        <button>Empty</button>
      </AutoTip>
      <AutoTip content={0}>
        <button>Zero</button>
      </AutoTip>
    </AutoConfigProvider>,
  );
  expect(
    screen.getAllByRole("complementary", { name: "Global help" }),
  ).toHaveLength(1);
  expect(
    screen.getByRole("complementary", { name: "Global help" }),
  ).toHaveTextContent("0");
  expect(screen.getByRole("button", { name: "Empty" })).not.toHaveAttribute(
    "aria-describedby",
  );
});

test("collapsed menu tips preserve the submenu popover trigger", async () => {
  const u = userEvent.setup();
  render(
    <AutoMenu
      collapsed
      items={[
        {
          id: "group",
          label: "Group",
          tip: "Group help",
          children: [{ id: "page", label: "Page" }],
        },
      ]}
    />,
  );
  const group = screen.getByRole("button", { name: "Group" });
  await u.hover(group);
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Group help");
  await u.click(group);
  expect(await screen.findByRole("button", { name: "Page" })).toBeVisible();
  expect(group).toHaveAttribute("aria-expanded", "true");
  await u.click(screen.getByRole("button", { name: "Page" }));
  expect(group).toHaveAttribute("aria-expanded", "false");
});

test("table passes its local tip component into the editor", async () => {
  const u = userEvent.setup();
  render(
    <AutoTable
      id="editor-tips"
      data={[{ id: "1", name: "Alice" }]}
      rowKey="id"
      tipComponent={LocalTip}
      columns={[{ key: "name", label: "Name", tip: "Editor help" }]}
      onAdd={() => {}}
    />,
  );
  await u.click(screen.getByRole("button", { name: "Add" }));
  expect(
    within(screen.getByRole("dialog")).getByRole("complementary", {
      name: "Local help",
    }),
  ).toHaveTextContent("Editor help");
});

test("the first Escape dismisses field help without closing its dialog", async () => {
  const u = userEvent.setup();
  function Example() {
    const [open, setOpen] = useState(true);
    return (
      <AutoDialog
        open={open}
        onOpenChange={setOpen}
        title="Help dialog"
        fields={[{ name: "name", label: "Name", tip: "Field help" }]}
      />
    );
  }
  render(<Example />);
  await u.hover(
    screen.getByRole("textbox").closest(".auto-field")!.querySelector("label")!,
  );
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Field help");
  await u.keyboard("{Escape}");
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  expect(screen.getByRole("dialog")).toBeVisible();
  await u.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("Escape dismisses the most recently opened tip first", async () => {
  const u = userEvent.setup();
  render(
    <>
      <AutoTip content="Focused help">
        <button>First</button>
      </AutoTip>
      <AutoTip content="Hovered help">
        <button>Second</button>
      </AutoTip>
    </>,
  );
  await u.tab();
  await u.hover(screen.getByRole("button", { name: "Second" }));
  expect(screen.getAllByRole("tooltip")).toHaveLength(2);
  await u.keyboard("{Escape}");
  expect(screen.getByRole("tooltip")).toHaveTextContent("Focused help");
});
