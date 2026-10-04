import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoConfigProvider } from "../src/core/AutoConfigProvider";
import { AutoSearch } from "../src/components/AutoSearch";
test("manual searches only on submit and reset once", async () => {
  const onSearch = vi.fn(),
    u = userEvent.setup();
  render(
    <AutoSearch
      mode="manual"
      fields={[{ name: "name", label: "Name", search: { match: "contains" } }]}
      onSearch={onSearch}
    />,
  );
  await u.type(screen.getByRole("textbox", { name: "Name" }), "Zhang");
  expect(onSearch).not.toHaveBeenCalled();
  await u.click(screen.getByText("Search"));
  expect(onSearch).toHaveBeenCalledTimes(1);
  await u.click(screen.getByText("Reset"));
  expect(onSearch).toHaveBeenCalledTimes(2);
});
test("searches immediately by default for text and choice changes, and reset emits once", async () => {
  const onSearch = vi.fn();
  const u = userEvent.setup();
  render(
    <AutoSearch
      fields={[
        { name: "name", label: "Name", search: { match: "contains" } },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [{ value: "active", label: "Active" }],
        },
      ]}
      onSearch={onSearch}
    />,
  );
  expect(onSearch).not.toHaveBeenCalled();
  await u.type(screen.getByRole("textbox", { name: "Name" }), "A");
  expect(onSearch).toHaveBeenLastCalledWith(
    expect.objectContaining({
      children: [
        expect.objectContaining({
          field: "name",
          operator: "contains",
          value: "A",
        }),
      ],
    }),
    expect.objectContaining({ name: "A" }),
  );
  await u.selectOptions(
    screen.getByRole("combobox", { name: "Status" }),
    screen.getByRole("option", { name: "Active" }),
  );
  expect(onSearch).toHaveBeenLastCalledWith(
    expect.objectContaining({
      children: expect.arrayContaining([
        expect.objectContaining({
          field: "status",
          operator: "eq",
          value: "active",
        }),
      ]),
    }),
    expect.objectContaining({ name: "A", status: "active" }),
  );
  const calls = onSearch.mock.calls.length;
  await u.click(screen.getByRole("button", { name: "Reset" }));
  expect(onSearch).toHaveBeenCalledTimes(calls + 1);
  expect(onSearch.mock.lastCall?.[0]).toEqual({
    kind: "group",
    operator: "and",
    children: [],
  });
});

// A field hidden by access control must not silently constrain the server query.
for (const mode of ["instant", "manual"] as const) {
  test(`${mode} search excludes denied fields from queries, including defaults and reset`, async () => {
    const onSearch = vi.fn();
    const u = userEvent.setup();
    render(
      <AutoConfigProvider
        config={{
          canAccess: (access) =>
            !access.roles?.includes("admin") &&
            !access.permissions?.includes("budget:read"),
        }}
      >
        <AutoSearch<{
          name: string;
          secret: string;
          budget: string;
          hidden: string;
        }>
          mode={mode}
          fields={[
            { name: "name", label: "Name", search: { match: "contains" } },
            {
              name: "secret",
              label: "Secret",
              roles: ["admin"],
              defaultValue: "private",
            },
            {
              name: "budget",
              label: "Budget",
              permissions: ["budget:read"],
              search: { match: "isNull" },
            },
            {
              name: "hidden",
              label: "Hidden",
              hidden: true,
              defaultValue: "invisible",
            },
          ]}
          onSearch={onSearch}
        />
      </AutoConfigProvider>,
    );
    expect(screen.queryByRole("textbox", { name: "Secret" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Budget" })).toBeNull();
    await u.type(screen.getByRole("textbox", { name: "Name" }), "A");
    if (mode === "manual")
      await u.click(screen.getByRole("button", { name: "Search" }));
    expect(onSearch.mock.lastCall?.[0]).toEqual({
      kind: "group",
      operator: "and",
      children: [
        { kind: "condition", field: "name", operator: "contains", value: "A" },
      ],
    });
    // The second callback argument remains the documented raw form values.
    expect(onSearch.mock.lastCall?.[1]).toMatchObject({
      name: "A",
      secret: "private",
      hidden: "invisible",
    });
    await u.click(screen.getByRole("button", { name: "Reset" }));
    expect(onSearch.mock.lastCall?.[0]).toEqual({
      kind: "group",
      operator: "and",
      children: [],
    });
  });
}

test("search rechecks permission after values were entered and access was revoked", async () => {
  const onSearch = vi.fn();
  const u = userEvent.setup();
  const view = (allowed: boolean) => (
    <AutoConfigProvider
      config={{
        canAccess: (access) =>
          !access.permissions?.includes("secret:read") || allowed,
      }}
    >
      <AutoSearch<{ name: string; secret: string }>
        mode="manual"
        fields={[
          { name: "name", label: "Name" },
          { name: "secret", label: "Secret", permissions: ["secret:read"] },
        ]}
        onSearch={onSearch}
      />
    </AutoConfigProvider>
  );
  const { rerender } = render(view(true));
  await u.type(screen.getByRole("textbox", { name: "Secret" }), "private");
  await u.click(screen.getByRole("button", { name: "Search" }));
  expect(onSearch.mock.lastCall?.[0].children).toEqual([
    { kind: "condition", field: "secret", operator: "eq", value: "private" },
  ]);
  rerender(view(false));
  expect(screen.queryByRole("textbox", { name: "Secret" })).toBeNull();
  await u.click(screen.getByRole("button", { name: "Search" }));
  expect(onSearch.mock.lastCall?.[0]).toEqual({
    kind: "group",
    operator: "and",
    children: [],
  });
});
