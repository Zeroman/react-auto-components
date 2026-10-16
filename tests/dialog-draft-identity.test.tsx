import { useState } from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, beforeEach, vi } from "vitest";
import { AutoDialog } from "../src/index";

function Host(props: {
  open: boolean;
  defaultValue: { name: string };
  draftKey: string;
  onSubmit?: (values: { name: string }) => Promise<void>;
}) {
  return (
    <AutoDialog
      open={props.open}
      onOpenChange={() => {}}
      title="Probe"
      fields={[{ name: "name" as const, label: "Name" }]}
      defaultValue={props.defaultValue}
      draftKey={props.draftKey}
      onSubmit={props.onSubmit}
    />
  );
}

const input = () => screen.getByRole("textbox", { name: "Name" });
const draftKey = (key: string) => `auto:draft:${key}`;

beforeEach(() => {
  window.localStorage.clear();
});

test("same draftKey keeps edits when defaultValue changes; different draftKey starts fresh", async () => {
  const u = userEvent.setup();
  const { rerender } = render(
    <Host open defaultValue={{ name: "first" }} draftKey="rec" />,
  );
  await waitFor(() => expect(input()).toHaveValue("first"));
  await u.type(input(), "-edit");
  expect(input()).toHaveValue("first-edit");
  // Same draftKey, new defaultValue: edits must be preserved.
  rerender(<Host open defaultValue={{ name: "second" }} draftKey="rec" />);
  expect(input()).toHaveValue("first-edit");
  // Different draftKey: fresh state seeded from that key's draft or default.
  rerender(<Host open defaultValue={{ name: "B-default" }} draftKey="rec-b" />);
  await waitFor(() => expect(input()).toHaveValue("B-default"));
});

test("closing writes the current draft under the current key only", async () => {
  const u = userEvent.setup();
  const { rerender } = render(
    <Host open defaultValue={{ name: "A" }} draftKey="rec-a" />,
  );
  await waitFor(() => expect(input()).toHaveValue("A"));
  await u.type(input(), "-edited");
  await u.click(screen.getByTestId("rac-cancel"));
  expect(JSON.parse(window.localStorage.getItem(draftKey("rec-a"))!)).toEqual({
    name: "A-edited",
  });

  rerender(<Host open={false} defaultValue={{ name: "A" }} draftKey="rec-a" />);
  // Reopen A: draft restored. Then switch to key B while open and cancel there.
  rerender(<Host open defaultValue={{ name: "A" }} draftKey="rec-a" />);
  await waitFor(() => expect(input()).toHaveValue("A-edited"));
  rerender(<Host open defaultValue={{ name: "B" }} draftKey="rec-b" />);
  await waitFor(() => expect(input()).toHaveValue("B"));
  await u.type(input(), "-B-edit");
  await u.click(screen.getByTestId("rac-cancel"));
  expect(JSON.parse(window.localStorage.getItem(draftKey("rec-a"))!)).toEqual({
    name: "A-edited",
  });
  expect(JSON.parse(window.localStorage.getItem(draftKey("rec-b"))!)).toEqual({
    name: "B-B-edit",
  });
});

test("a stale in-flight submit for the old record cannot close the new dialog", async () => {
  let resolveA: () => void = () => {};
  const submitA = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveA = resolve;
      }),
  );
  let switchRecord!: () => void;
  function Host2() {
    const [open, setOpen] = useState(true);
    const [key, setKey] = useState("stale-a");
    switchRecord = () => setKey("stale-b");
    return (
      <>
        <AutoDialog
          open={open}
          onOpenChange={setOpen}
          title="Probe"
          fields={[{ name: "name" as const, label: "Name" }]}
          defaultValue={{ name: key }}
          draftKey={key}
          onSubmit={key === "stale-a" ? submitA : undefined}
        />
        <button onClick={() => setKey("stale-b")}>switch</button>
      </>
    );
  }
  const u = userEvent.setup();
  render(<Host2 />);
  await waitFor(() => expect(input()).toHaveValue("stale-a"));
  await u.click(screen.getByText("OK"));
  // Switch identity while A's submit is still in flight.
  await waitFor(() => expect(submitA).toHaveBeenCalledTimes(1));
  act(() => switchRecord());
  await waitFor(() => expect(input()).toHaveValue("stale-b"));
  await act(async () => {
    resolveA();
    await Promise.resolve();
  });
  // The stale A completion must not unmount B.
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(input()).toHaveValue("stale-b");
});

test("unmount-close then reopen resets to defaultValue", async () => {
  const { rerender } = render(
    <Host open defaultValue={{ name: "one" }} draftKey="reset" />,
  );
  await waitFor(() => expect(input()).toHaveValue("one"));
  rerender(
    <Host open={false} defaultValue={{ name: "one" }} draftKey="reset" />,
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  rerender(<Host open defaultValue={{ name: "two" }} draftKey="reset" />);
  await waitFor(() => expect(input()).toBeVisible());
  expect(input()).toHaveValue("two");
});
