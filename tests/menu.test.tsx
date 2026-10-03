import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoMenu, type AutoMenuItem } from "../src/components/AutoMenu";
import { AutoConfigProvider, type AutoServices } from "../src";

const items = [
  { id: "table", label: "AutoTable", description: "Smart table" },
  { id: "form", label: "AutoForm", description: "Dynamic form" },
];

test("cyclic references in remote items cannot cause runaway recursion", () => {
  const poisoned: AutoMenuItem[] = [
    {
      id: "loop",
      label: "Ring",
      children: [{ id: "inner", label: "Inner", children: [] }],
    },
    { id: "safe", label: "Safe page" },
  ];
  // Remote data is corrupted: a child points back at an ancestor.
  (poisoned[0].children as AutoMenuItem[])[0].children = [poisoned[0]];
  render(<AutoMenu items={poisoned} defaultValue="safe" />);
  expect(screen.getByRole("button", { name: "Safe page" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // The cycle's subtree is dropped, so rendering finishes and does not hang.
  expect(
    screen.queryByRole("button", { name: "Ring" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Inner" }),
  ).not.toBeInTheDocument();
});

test("renders items, auto-selects the first entry and reports selection", async () => {
  const change = vi.fn(),
    u = userEvent.setup();
  render(
    <AutoMenu
      items={items}
      label="Component workspace"
      header={<strong>AutoStudio</strong>}
      footer={<small>v0.1.0</small>}
      onChange={change}
    />,
  );
  expect(
    screen.getByRole("navigation", { name: "Component workspace" }),
  ).toBeVisible();
  expect(screen.getByText("AutoStudio")).toBeVisible();
  expect(screen.getByText("v0.1.0")).toBeVisible();
  expect(screen.getByText("Smart table")).toBeVisible();
  expect(screen.getByRole("button", { name: /AutoTable/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await u.click(screen.getByRole("button", { name: /AutoForm/ }));
  expect(screen.getByRole("button", { name: /AutoForm/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(change).toHaveBeenCalledWith("form", items[1], ["form"]);
});

test("controlled value keeps the selection while items still report clicks", async () => {
  const change = vi.fn(),
    u = userEvent.setup();
  render(<AutoMenu items={items} value="form" onChange={change} />);
  await u.click(screen.getByRole("button", { name: /AutoTable/ }));
  expect(screen.getByRole("button", { name: /AutoForm/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("button", { name: /AutoTable/ })).not.toHaveAttribute(
    "aria-current",
  );
  expect(change).toHaveBeenCalledWith("table", items[0], ["table"]);
});

test("nested items expand, carry their path and filter hidden entries", async () => {
  const change = vi.fn(),
    u = userEvent.setup();
  render(
    <AutoConfigProvider
      config={
        {
          canAccess: (access) => !access.roles?.includes("admin"),
        } satisfies Partial<AutoServices>
      }
    >
      <AutoMenu
        defaultValue="group/child"
        items={[
          {
            id: "group",
            label: "Group",
            children: [
              { id: "group/child", label: "Child item", description: "Nested" },
              { id: "group/hidden", label: "Hidden item", hidden: true },
            ],
          },
          { id: "single", label: "Single page", roles: ["admin"] },
        ]}
        onChange={change}
      />
    </AutoConfigProvider>,
  );
  const group = screen.getByRole("button", { name: "Group" });
  expect(group).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("Nested")).toBeVisible();
  expect(screen.queryByText("Hidden item")).not.toBeInTheDocument();
  expect(screen.queryByText("Single page")).not.toBeInTheDocument();
  await u.click(group);
  expect(group).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByText("Nested")).not.toBeInTheDocument();
  await u.click(group);
  await u.click(screen.getByRole("button", { name: /Child item/ }));
  expect(change).toHaveBeenCalledWith("group/child", expect.anything(), [
    "group",
    "group/child",
  ]);
});

test("collapsible menus toggle into an icon rail with notifications", async () => {
  const collapsedChange = vi.fn(),
    u = userEvent.setup();
  render(
    <AutoMenu
      items={[{ id: "a", label: "Tabs", icon: "▤" }]}
      collapsible
      onCollapsedChange={collapsedChange}
    />,
  );
  const toggle = screen.getByRole("button", { name: "Collapse menu" });
  await u.click(toggle);
  expect(collapsedChange).toHaveBeenCalledWith(true);
  expect(screen.getByRole("button", { name: "Expand menu" })).toBeVisible();
  await u.hover(screen.getByRole("button", { name: "Tabs" }));
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Tabs");
});

test("provider menu settings drive size, density and translations", () => {
  render(
    <AutoConfigProvider
      config={{
        t: (key, fallback) =>
          key === "Navigation" ? "Nav" : (fallback ?? key),
        menu: { size: "small", density: "compact" },
      }}
    >
      <AutoMenu items={items} />
    </AutoConfigProvider>,
  );
  const nav = screen.getByRole("navigation", { name: "Nav" });
  expect(nav).toHaveAttribute("data-size", "small");
  expect(nav).toHaveAttribute("data-density", "compact");
});

test("permission-filtered groups disappear and disabled branches cannot become selected", async () => {
  const change = vi.fn();
  const u = userEvent.setup();
  render(
    <AutoMenu
      onChange={change}
      items={[
        {
          id: "empty",
          label: "Empty group",
          children: [{ id: "secret", label: "Secret", hidden: () => true }],
        },
        {
          id: "disabled",
          label: "Disabled group",
          disabled: true,
          children: [{ id: "child", label: "Disabled child" }],
        },
        {
          id: "dead",
          label: "No enabled children",
          children: [
            { id: "dead-child", label: "Unavailable", disabled: true },
          ],
        },
        { id: "ready", label: "Ready" },
      ]}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "Empty group" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ready" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await u.click(screen.getByRole("button", { name: "Disabled group" }));
  expect(
    screen.queryByRole("button", { name: "Disabled child" }),
  ).not.toBeInTheDocument();
  expect(change).not.toHaveBeenCalled();
});

test("unknown controlled values do not falsely highlight a different page", () => {
  const { rerender } = render(<AutoMenu items={items} value="missing" />);
  expect(document.querySelector("[aria-current]")).toBeNull();
  rerender(<AutoMenu items={items} value="" />);
  expect(document.querySelector("[aria-current]")).toBeNull();
});

test("collapsed groups open a flyout and nested choices retain the full path", async () => {
  const change = vi.fn();
  const u = userEvent.setup();
  render(
    <AutoMenu
      collapsed
      onChange={change}
      items={[
        {
          id: "workspace",
          label: "Workspace",
          children: [
            {
              id: "reports",
              label: "Reports",
              children: [{ id: "weekly", label: "Weekly" }],
            },
          ],
        },
      ]}
    />,
  );
  const trigger = screen.getByRole("button", { name: "Workspace" });
  expect(trigger).toHaveTextContent("W");
  await u.click(trigger);
  await u.click(await screen.findByRole("button", { name: "Weekly" }));
  expect(change).toHaveBeenCalledWith("weekly", expect.anything(), [
    "workspace",
    "reports",
    "weekly",
  ]);
  expect(
    screen.queryByRole("button", { name: "Weekly" }),
  ).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test("arrow navigation skips disabled entries and supports parent and child traversal", async () => {
  const u = userEvent.setup();
  render(
    <AutoMenu
      value="outside"
      items={[
        {
          id: "constructor",
          label: "Group",
          children: [{ id: "child", label: "Child" }],
        },
        { id: "disabled", label: "Disabled", disabled: true },
        { id: "end", label: "Last" },
      ]}
    />,
  );
  const group = screen.getByRole("button", { name: "Group" });
  group.focus();
  await u.keyboard("{ArrowRight}{ArrowRight}");
  expect(screen.getByRole("button", { name: "Child" })).toHaveFocus();
  await u.keyboard("{ArrowLeft}");
  expect(group).toHaveFocus();
  await u.keyboard("{ArrowLeft}{ArrowDown}");
  expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
  await u.keyboard("{Home}");
  expect(group).toHaveFocus();
});

test("external selection reveals its ancestors without preventing manual collapse", async () => {
  const u = userEvent.setup();
  const nested = [
    {
      id: "group",
      label: "Group",
      children: [
        { id: "one", label: "One" },
        { id: "two", label: "Two" },
      ],
    },
  ];
  const { rerender } = render(<AutoMenu items={nested} value="one" />);
  await u.click(screen.getByRole("button", { name: "Group" }));
  expect(screen.queryByRole("button", { name: "One" })).not.toBeInTheDocument();
  rerender(<AutoMenu items={nested} value="two" />);
  expect(screen.getByRole("button", { name: "Two" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await u.click(screen.getByRole("button", { name: "Group" }));
  expect(screen.queryByRole("button", { name: "Two" })).not.toBeInTheDocument();
});
