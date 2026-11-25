import { waitFor } from "@testing-library/react";
import { expect } from "vitest";

/**
 * FloatingFocusManager moves focus into an open popover on the next animation
 * frame (floating-ui `enqueueFocus`). Typing into a popover field before that
 * deferred focus lands loses the keystroke to it: focus jumps to the first
 * tabbable element instead. Await this after opening a popover and before
 * `userEvent.type` into one of its fields.
 */
export function settlePopoverFocus() {
  return waitFor(() =>
    expect(document.querySelector(".auto-popover")).toContainElement(
      document.activeElement as HTMLElement | null,
    ),
  );
}
