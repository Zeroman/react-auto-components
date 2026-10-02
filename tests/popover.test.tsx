import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { Popover } from "../src/internal/Popover";
test("popover opens and treats strings as text", async () => {
  const u = userEvent.setup();
  render(
    <Popover content={"<b>Safe text</b>"}>
      <button>Details</button>
    </Popover>,
  );
  await u.click(screen.getByText("Details"));
  expect(await screen.findByText("<b>Safe text</b>")).toBeVisible();
  await u.keyboard("{Escape}");
  expect(screen.queryByText("<b>Safe text</b>")).not.toBeInTheDocument();
});

test("internal popover preserves the trigger ref and controlled keyboard dismissal", async () => {
  const triggerRef = createRef<HTMLButtonElement>();
  function Fixture() {
    const [open, setOpen] = useState(false);
    return (
      <Popover
        open={open}
        onOpenChange={setOpen}
        content={<button>Choice</button>}
      >
        <button ref={triggerRef}>Open filter</button>
      </Popover>
    );
  }
  const u = userEvent.setup();
  render(<Fixture />);
  expect(triggerRef.current).toBe(
    screen.getByRole("button", { name: "Open filter" }),
  );
  triggerRef.current!.focus();
  await u.keyboard("{Enter}");
  expect(await screen.findByRole("dialog")).toBeVisible();
  await u.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(triggerRef.current).toHaveFocus();
});
