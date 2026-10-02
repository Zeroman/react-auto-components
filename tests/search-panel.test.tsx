import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoSearch } from "../src/components/AutoSearch";
test("manual searches only on submit and reset once", async () => {
  const onSearch = vi.fn(),
    u = userEvent.setup();
  render(
    <AutoSearch
      fields={[{ name: "name", label: "Name", match: "contains" }]}
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
