import { act, render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test, expect, afterEach } from "vitest";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { AutoTip } from "../src/internal/AutoTip";
import { Popover } from "../src/internal/Popover";

afterEach(cleanup);

// Audit 1.6: Popover always portals to document.body. When the trigger sits
// inside a modal dialog, Radix's focus trap and the body-level
// pointer-events: none lock intercept the portalled popover. AutoTip already
// portals into the nearest [role="dialog"]; Popover must do the same.
test("popover opened inside a dialog portals into the dialog", async () => {
  const user = userEvent.setup();
  function Inner() {
    const [open, setOpen] = useState(false);
    return (
      <Popover
        open={open}
        onOpenChange={setOpen}
        content={<div>POPCHECK</div>}
        placement="bottom"
      >
        <button type="button">pop-trigger</button>
      </Popover>
    );
  }
  render(
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Content data-testid="rac-dialog">
          <Dialog.Title>Dialog</Dialog.Title>
          <Inner />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>,
  );
  await act(async () => {
    await user.click(screen.getByText("pop-trigger"));
  });
  const check = screen.getByText("POPCHECK");
  // Note: the popover element itself gets role="dialog" from useRole, so we
  // must check containment in the Radix dialog content, not closest().
  expect(screen.getByTestId("rac-dialog").contains(check)).toBe(true);
});

// The portal placement exists so the popover is actually usable inside a
// modal dialog: typing in the popup and clicking popup actions must work
// (a body-level portal is intercepted by the dialog's focus lock and
// pointer-events: none in a real browser).
test("popover content inside a dialog accepts typing and clicks", async () => {
  const user = userEvent.setup();
  let clicked = 0;
  function Inner() {
    const [open, setOpen] = useState(false);
    return (
      <Popover
        open={open}
        onOpenChange={setOpen}
        content={
          <>
            <input aria-label="pop-input" />
            <button type="button" onClick={() => (clicked += 1)}>
              POP-ACTION
            </button>
          </>
        }
      >
        <button type="button">pop-trigger</button>
      </Popover>
    );
  }
  render(
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Content data-testid="rac-dialog">
          <Dialog.Title>Dialog</Dialog.Title>
          <Inner />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>,
  );
  await act(async () => {
    await user.click(screen.getByText("pop-trigger"));
  });
  const input = screen.getByLabelText("pop-input");
  await act(async () => {
    await user.type(input, "hello");
  });
  expect(input).toHaveValue("hello");
  await act(async () => {
    await user.click(screen.getByText("POP-ACTION"));
  });
  expect(clicked).toBe(1);
  // The popup stayed open while interacting with it.
  expect(screen.getByText("POP-ACTION")).toBeInTheDocument();
});

// Guard the existing out-of-dialog behavior: portal root stays document.body.
test("popover outside a dialog still portals to document.body", async () => {
  const user = userEvent.setup();
  function Inner() {
    const [open, setOpen] = useState(false);
    return (
      <Popover
        open={open}
        onOpenChange={setOpen}
        content={<div>BODYCHECK</div>}
      >
        <button type="button">pop-trigger</button>
      </Popover>
    );
  }
  render(
    <div>
      <Inner />
    </div>,
  );
  await act(async () => {
    await user.click(screen.getByText("pop-trigger"));
  });
  // Without a dialog ancestor the portal must stay attached under body.
  const check = screen.getByText("BODYCHECK");
  expect(document.body.contains(check)).toBe(true);
});

// Same dialog-placement contract for AutoTip (already portals into the
// dialog, but must read the reference from context state, not a ref).
test("tooltip inside a dialog portals into the dialog", async () => {
  const user = userEvent.setup();
  render(
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Content>
          <Dialog.Title>Dialog</Dialog.Title>
          <AutoTip content="TIPCHECK">
            <button type="button">tip-trigger</button>
          </AutoTip>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>,
  );
  await act(async () => {
    await user.hover(screen.getByText("tip-trigger"));
  });
  expect(
    screen.getByText("TIPCHECK").closest('[role="dialog"]'),
  ).not.toBeNull();
});
