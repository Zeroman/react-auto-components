import { expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoConfigProvider } from "../src/core/AutoConfigProvider";
import { AutoTable } from "../src/components/AutoTable";
import type { AutoTipProps } from "../src";

function GlobalTip({ content, children }: AutoTipProps) {
  return (
    <>
      {children}
      <aside aria-label="Global help">{content}</aside>
    </>
  );
}

function FormTip({ content, children }: AutoTipProps) {
  return (
    <>
      {children}
      <aside aria-label="Form help">{content}</aside>
    </>
  );
}

const surfaces = ["header", "search", "edit"] as const;
type Surface = (typeof surfaces)[number];

async function renderTableSurface(surface: Surface, global: boolean) {
  const user = userEvent.setup();
  render(
    <AutoConfigProvider
      config={{
        tipComponent: global ? GlobalTip : undefined,
        form: { tipComponent: FormTip },
      }}
    >
      <AutoTable
        id={`tip-precedence-${surface}`}
        data={[{ id: "1", name: "Alice" }]}
        rowKey="id"
        virtual={false}
        columns={[{ key: "name", label: "Name", tip: "Name help" }]}
        searchFields={[
          { name: "name", label: "Search name", tip: "Name help" },
        ]}
        onEdit={() => {}}
      />
    </AutoConfigProvider>,
  );
  if (surface === "header") {
    const scope = screen
      .getByRole("button", { name: "Sort Name" })
      .closest("th")!;
    return {
      user,
      scope,
      trigger: within(scope).getByRole("button", { name: "Name" }),
    };
  }
  if (surface === "edit") {
    await user.click(screen.getByRole("button", { name: "Edit row 1" }));
    const dialog = screen.getByRole("dialog", { name: "Edit record" });
    expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveValue(
      "Alice",
    );
    const scope = within(dialog)
      .getByRole("textbox", { name: "Name" })
      .closest<HTMLElement>(".auto-field")!;
    return { user, scope: dialog, trigger: scope.querySelector("label")! };
  }
  const scope = screen
    .getByRole("textbox", { name: "Search name" })
    .closest<HTMLElement>(".auto-field")!;
  return {
    user,
    scope: scope.closest<HTMLElement>(".auto-search")!,
    trigger: scope.querySelector("label")!,
  };
}

test.each(surfaces)(
  "table %s uses global help ahead of form defaults",
  async (surface) => {
    const { scope } = await renderTableSurface(surface, true);
    expect(
      within(scope).getByRole("complementary", { name: "Global help" }),
    ).toHaveTextContent("Name help");
    expect(
      within(scope).queryByRole("complementary", { name: "Form help" }),
    ).not.toBeInTheDocument();
  },
);

test.each(surfaces)(
  "table %s uses built-in help when only form defaults are configured",
  async (surface) => {
    const { user, scope, trigger } = await renderTableSurface(surface, false);
    expect(
      within(scope).queryByRole("complementary", { name: "Form help" }),
    ).not.toBeInTheDocument();
    await user.hover(trigger);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Name help");
  },
);

test("undefined search tip override still uses table fallback", () => {
  render(
    <AutoConfigProvider
      config={{ tipComponent: GlobalTip, form: { tipComponent: FormTip } }}
    >
      <AutoTable
        id="undefined-search-tip"
        rowKey="id"
        data={[{ id: "1", name: "Alice" }]}
        columns={[{ key: "name", label: "Name" }]}
        searchFields={[{ name: "name", tip: "Search help" }]}
        searchLayout={{ tipComponent: undefined }}
      />
    </AutoConfigProvider>,
  );
  expect(
    screen.getByRole("complementary", { name: "Global help" }),
  ).toHaveTextContent("Search help");
  expect(screen.queryByRole("complementary", { name: "Form help" })).toBeNull();
});
