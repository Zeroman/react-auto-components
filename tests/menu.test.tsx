import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoMenu, type AutoMenuItem } from "../src/components/AutoMenu";
import { AutoConfigProvider, type AutoServices } from "../src";

const items = [
  { id: "table", label: "AutoTable", description: "智能表格" },
  { id: "form", label: "AutoForm", description: "动态表单" },
];

test("cyclic references in remote items cannot cause runaway recursion", () => {
  const poisoned: AutoMenuItem[] = [
    {
      id: "loop",
      label: "环",
      children: [{ id: "inner", label: "内", children: [] }],
    },
    { id: "safe", label: "安全页" },
  ];
  // 模拟被污染的远端数据：子级指回祖先
  (poisoned[0].children as AutoMenuItem[])[0].children = [poisoned[0]];
  render(<AutoMenu items={poisoned} defaultValue="safe" />);
  expect(screen.getByRole("button", { name: "安全页" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // 环所在的子树被丢弃，渲染安全终止且不挂起
  expect(screen.queryByRole("button", { name: "环" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "内" })).not.toBeInTheDocument();
});

test("renders items, auto-selects the first entry and reports selection", async () => {
  const change = vi.fn(),
    u = userEvent.setup();
  render(
    <AutoMenu
      items={items}
      label="组件工作区"
      header={<strong>AutoStudio</strong>}
      footer={<small>v0.1.0</small>}
      onChange={change}
    />,
  );
  expect(screen.getByRole("navigation", { name: "组件工作区" })).toBeVisible();
  expect(screen.getByText("AutoStudio")).toBeVisible();
  expect(screen.getByText("v0.1.0")).toBeVisible();
  expect(screen.getByText("智能表格")).toBeVisible();
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
            label: "分组",
            children: [
              { id: "group/child", label: "子项", description: "嵌套" },
              { id: "group/hidden", label: "隐藏项", hidden: true },
            ],
          },
          { id: "single", label: "单页", roles: ["admin"] },
        ]}
        onChange={change}
      />
    </AutoConfigProvider>,
  );
  const group = screen.getByRole("button", { name: "分组" });
  expect(group).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("嵌套")).toBeVisible();
  expect(screen.queryByText("隐藏项")).not.toBeInTheDocument();
  expect(screen.queryByText("单页")).not.toBeInTheDocument();
  await u.click(group);
  expect(group).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByText("嵌套")).not.toBeInTheDocument();
  await u.click(group);
  await u.click(screen.getByRole("button", { name: /子项/ }));
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
      items={[{ id: "a", label: "标签页", icon: "▤" }]}
      collapsible
      onCollapsedChange={collapsedChange}
    />,
  );
  const toggle = screen.getByRole("button", { name: "收起菜单" });
  await u.click(toggle);
  expect(collapsedChange).toHaveBeenCalledWith(true);
  expect(screen.getByRole("button", { name: "展开菜单" })).toBeVisible();
  expect(screen.getByRole("button", { name: "标签页" })).toHaveAttribute(
    "title",
    "标签页",
  );
});

test("provider menu settings drive size, density and translations", () => {
  render(
    <AutoConfigProvider
      config={{
        t: (key, fallback) =>
          key === "导航菜单" ? "Navigation" : (fallback ?? key),
        menu: { size: "small", density: "compact" },
      }}
    >
      <AutoMenu items={items} />
    </AutoConfigProvider>,
  );
  const nav = screen.getByRole("navigation", { name: "Navigation" });
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
