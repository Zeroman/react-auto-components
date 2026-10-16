import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoSearch } from "../src/components/AutoSearch";

afterEach(cleanup);

async function openPopover() {
  await userEvent.click(screen.getByTestId("rac-more-filters"));
  await screen.findByRole("button", { name: "Close" });
}

test("popover search validates required more-fields before searching", async () => {
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
  await openPopover();
  await userEvent.click(screen.getAllByText("Search").at(-1)!);
  expect(await screen.findByText("Owner is required")).toBeVisible();
  expect(onSearch).not.toHaveBeenCalled();
});

test("popover search runs field rules before searching", async () => {
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
          rules: [(v) => (v === "bad" ? "Invalid owner" : undefined)],
        },
      ]}
      defaultValue={{ owner: "bad" }}
      onSearch={onSearch}
    />,
  );
  await openPopover();
  await userEvent.click(screen.getAllByText("Search").at(-1)!);
  expect(await screen.findByText("Invalid owner")).toBeVisible();
  expect(onSearch).not.toHaveBeenCalled();
});

test("popover reset in manual mode clears more fields and searches", async () => {
  const onSearch = vi.fn();
  render(
    <AutoSearch
      mode="manual"
      moreLayout="popover"
      fields={[
        { name: "name", label: "Name" },
        { name: "owner", label: "Owner", search: { more: true } },
      ]}
      defaultValue={{ name: "keep", owner: "stale" }}
      onSearch={onSearch}
    />,
  );
  await openPopover();
  await userEvent.click(screen.getAllByText("Reset").at(-1)!);
  await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
  expect(onSearch.mock.lastCall?.[1]).toMatchObject({
    name: "keep",
    owner: "stale" /* defaultValue restored, not just deleted */,
  });
  const query = JSON.stringify(onSearch.mock.lastCall?.[0]);
  expect(query).not.toContain("between");
});

test("popover form respects disabled", async () => {
  render(
    <AutoSearch
      mode="manual"
      moreLayout="popover"
      disabled
      fields={[
        { name: "name", label: "Name" },
        { name: "owner", label: "Owner", search: { more: true } },
      ]}
      onSearch={vi.fn()}
    />,
  );
  await openPopover();
  expect(screen.getByLabelText("Owner")).toBeDisabled();
  expect(screen.getAllByText("Search").at(-1)).toBeDisabled();
});

test("cleared range no longer counts as an active more filter", async () => {
  function Harness() {
    const [value, setValue] = useState<{
      name: string;
      created: [string | null, string | null];
    }>({
      name: "",
      created: ["2025-01-01", null],
    });
    return (
      <AutoSearch<{
        name: string;
        created: [string | null, string | null];
      }>
        mode="manual"
        moreLayout="popover"
        fields={[
          { name: "name", label: "Name" },
          {
            name: "created",
            label: "Created",
            type: "daterange",
            search: { more: true },
          },
        ]}
        value={value}
        onChange={setValue}
        onSearch={vi.fn()}
      />
    );
  }
  render(<Harness />);
  await openPopover();
  // Clear both ends of the range.
  const start = screen.getByLabelText("Created start");
  const end = screen.getByLabelText("Created end");
  await userEvent.clear(start);
  await userEvent.clear(end);
  // Close and reopen: the badge must be gone.
  await userEvent.click(
    screen.getAllByRole("button", { name: "Close" }).at(-1)!,
  );
  expect(screen.queryByText("1")).toBeNull();
});
