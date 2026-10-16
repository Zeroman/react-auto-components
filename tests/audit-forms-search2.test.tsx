import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoSearch } from "../src/components/AutoSearch";
import { AutoForm } from "../src/components/AutoForm";

afterEach(cleanup);

test("closed popover more-fields still validate on main search with an actionable error", async () => {
  const onSearch = vi.fn();
  const rule = vi.fn((v: unknown) =>
    v === "bad" ? "Owner is unacceptable" : undefined,
  );
  render(
    <AutoSearch
      mode="manual"
      moreLayout="popover"
      fields={[
        { name: "name", label: "Name" },
        {
          name: "owner",
          label: "Owner",
          search: { more: true },
          defaultValue: "bad",
          rules: [rule],
        },
      ]}
      onSearch={onSearch}
    />,
  );
  await userEvent.click(screen.getByTestId("rac-search"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Owner is unacceptable",
  );
  expect(onSearch).not.toHaveBeenCalled();
  expect(rule).toHaveBeenCalledTimes(1);
});

test("main Search also validates closed-popover required more-fields", async () => {
  const onSearch = vi.fn();
  render(
    <AutoSearch
      mode="manual"
      moreLayout="popover"
      fields={[
        { name: "name", label: "Name" },
        {
          name: "owner",
          label: "Owner",
          search: { more: true },
          required: true,
        },
      ]}
      onSearch={onSearch}
    />,
  );
  await userEvent.click(screen.getByTestId("rac-search"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Owner is required",
  );
  expect(onSearch).not.toHaveBeenCalled();
});

test("popover instant edits validate the outgoing changed values", async () => {
  const onSearch = vi.fn();
  // Always-failing rule: no keystroke may emit a query, including the first.
  const rule = vi.fn((_value: unknown) => "Owner is unacceptable");
  render(
    <AutoSearch
      moreLayout="popover"
      fields={[
        { name: "name", label: "Name" },
        {
          name: "owner",
          label: "Owner",
          search: { more: true },
          rules: [rule],
        },
      ]}
      onSearch={onSearch}
    />,
  );
  await userEvent.click(screen.getByTestId("rac-more-filters"));
  await userEvent.type(await screen.findByLabelText("Owner"), "bad");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Owner is unacceptable",
  );
  expect(onSearch).not.toHaveBeenCalled();
  expect(rule.mock.calls.at(-1)?.[0]).toBe("bad");
});

for (const mode of ["instant", "manual"] as const) {
  test(`popover reset searches exactly once without validation (${mode})`, async () => {
    const onSearch = vi.fn();
    const rule = vi.fn((_value: unknown) => "Owner is unacceptable");
    render(
      <AutoSearch
        mode={mode}
        moreLayout="popover"
        fields={[
          { name: "name", label: "Name" },
          {
            name: "owner",
            label: "Owner",
            search: { more: true },
            defaultValue: "stale",
            rules: [rule],
          },
        ]}
        onSearch={onSearch}
      />,
    );
    // Produce a stale validation error first: instant via an edit, manual
    // via the popover Search button (typing alone does not search).
    await userEvent.click(screen.getByTestId("rac-more-filters"));
    await userEvent.type(await screen.findByLabelText("Owner"), "x");
    if (mode === "manual")
      await userEvent.click(
        document.querySelector<HTMLButtonElement>(
          ".auto-search-popover-actions .auto-primary",
        )!,
      );
    await screen.findByRole("alert");
    const searches = onSearch.mock.calls.length;
    await userEvent.click(screen.getAllByText("Reset").at(-1)!);
    await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(searches + 1));
    expect(rule).toHaveBeenCalledTimes(1); // reset must not re-validate
    expect(onSearch.mock.lastCall?.[1]).toMatchObject({ owner: "stale" });
    expect(screen.queryByRole("alert")).toBeNull();
  });
}

test("form-level root slot styles fields, not the form element", () => {
  const { container } = render(
    <AutoForm
      classNames={{ root: "field-root", form: "form-root" }}
      fields={[{ name: "n", label: "N" }]}
    />,
  );
  const form = container.querySelector("form")!;
  expect(form).toHaveClass("form-root");
  expect(form).not.toHaveClass("field-root");
  expect(container.querySelector(".auto-field")).toHaveClass("field-root");
});
