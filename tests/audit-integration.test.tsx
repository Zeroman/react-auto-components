import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { expect, test, vi } from "vitest";
import { cloneValue, defaults, equal } from "../src/core/config";
import { validateFields } from "../src/core/validation";
import { AutoForm, type AutoFormHandle } from "../src/components/AutoForm";
import { AutoSearch } from "../src/components/AutoSearch";

test("default copies preserve special own keys without changing prototypes", () => {
  const input = JSON.parse(
    '{"__proto__":{"polluted":true},"nested":{"__proto__":{"x":1}}}',
  );
  const copied = defaults([], input) as typeof input;
  expect(Object.getPrototypeOf(copied)).toBe(Object.prototype);
  expect(Object.hasOwn(copied, "__proto__")).toBe(true);
  expect(copied.polluted).toBeUndefined();
  expect(Object.getPrototypeOf(copied.nested)).toBe(Object.prototype);
  expect(Object.hasOwn(copied.nested, "__proto__")).toBe(true);
  const field = defaults([{ name: "__proto__", defaultValue: { x: 1 } }]);
  expect(Object.getPrototypeOf(field)).toBe(Object.prototype);
  expect(Object.hasOwn(field, "__proto__")).toBe(true);
});

test("default cloning preserves sparse range positions and mutable collections", () => {
  const range = new Array(2);
  range[1] = "2026-01-01";
  const original = {
    range,
    map: new Map([["x", { n: 1 }]]),
    set: new Set([{ n: 1 }]),
  };
  const copied = cloneValue(original);
  expect(copied.range).toHaveLength(2);
  expect(0 in copied.range).toBe(false);
  expect(copied.range[1]).toBe("2026-01-01");
  copied.map.get("x")!.n = 2;
  [...copied.set][0].n = 2;
  expect(original.map.get("x")!.n).toBe(1);
  expect([...original.set][0].n).toBe(1);
  expect(equal(new Array(2), [])).toBe(false);
});

test("equality of copied cyclic form values terminates and detects differences", () => {
  const original: { n: number; self?: unknown } = { n: 1 };
  original.self = original;
  const copied = cloneValue(original);
  expect(copied.self).toBe(copied);
  expect(equal(original, copied)).toBe(true);
  copied.n = 2;
  expect(equal(original, copied)).toBe(false);
});

test("required sparse ranges and special field names cannot bypass validation", async () => {
  const range = new Array(2);
  range[1] = "2026-01-01";
  const failures = await validateFields(
    [
      { name: "range", type: "daterange", required: true },
      { name: "__proto__", required: true },
    ],
    { range, ...JSON.parse('{"__proto__":""}') },
    {
      tr: (s) => s,
      canAccess: () => true,
    },
  );
  expect(Object.keys(failures)).toEqual(["range", "__proto__"]);
});

function pendingUpload() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  const upload = vi.fn((_files: File[], _signal: AbortSignal) => promise);
  return { upload, resolve };
}
async function chooseFile() {
  await userEvent.upload(
    screen.getByLabelText("File"),
    new File(["x"], "a.txt"),
  );
}

test("unmount aborts an upload begun with an empty value and discards its late result", async () => {
  const gate = pendingUpload();
  const change = vi.fn();
  const view = render(
    <AutoForm
      fields={[
        { name: "file", label: "File", type: "upload", upload: gate.upload },
      ]}
      onChange={change}
    />,
  );
  await chooseFile();
  view.unmount();
  expect(gate.upload.mock.calls[0][1].aborted).toBe(true);
  await act(async () => gate.resolve());
  expect(change).not.toHaveBeenCalled();
});

test("cyclic controlled defaults do not recurse while synchronizing a form", () => {
  const value: { name: string; self?: unknown } = { name: "Ada" };
  value.self = value;
  const ref = createRef<AutoFormHandle<typeof value>>();
  render(
    <AutoForm
      ref={ref}
      fields={[{ name: "name", label: "Name" }]}
      value={value}
    />,
  );
  expect(screen.getByLabelText("Name")).toHaveValue("Ada");
});

test("instant search retains pending upload validation", async () => {
  const gate = pendingUpload();
  const search = vi.fn();
  render(
    <AutoSearch
      fields={[
        { name: "file", label: "File", type: "upload", upload: gate.upload },
        { name: "name", label: "Name" },
      ]}
      onSearch={search}
    />,
  );
  await chooseFile();
  await userEvent.type(screen.getByLabelText("Name"), "Ada");
  expect(search).not.toHaveBeenCalled();
  await act(async () => gate.resolve());
});

test("main search does not validate an expanded inline more rule twice", async () => {
  const rule = vi.fn(() => undefined);
  const search = vi.fn();
  render(
    <AutoSearch
      mode="manual"
      fields={[
        {
          name: "extra",
          label: "Extra",
          search: { more: true },
          rules: [rule],
        },
      ]}
      onSearch={search}
    />,
  );
  await userEvent.click(screen.getByTestId("rac-more-filters"));
  await userEvent.click(screen.getByTestId("rac-search"));
  await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
  expect(rule).toHaveBeenCalledTimes(1);
});

test("popover search waits for a main-form upload", async () => {
  const gate = pendingUpload();
  const search = vi.fn();
  render(
    <AutoSearch
      moreLayout="popover"
      mode="manual"
      fields={[
        { name: "file", label: "File", type: "upload", upload: gate.upload },
        { name: "extra", label: "Extra", search: { more: true } },
      ]}
      onSearch={search}
    />,
  );
  await chooseFile();
  await userEvent.click(screen.getByTestId("rac-more-filters"));
  await userEvent.click(
    document.querySelector<HTMLButtonElement>(
      ".auto-search-popover-panel .auto-primary",
    )!,
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  expect(search).not.toHaveBeenCalled();
  await act(async () => gate.resolve());
  await userEvent.click(
    document.querySelector<HTMLButtonElement>(
      ".auto-search-popover-panel .auto-primary",
    )!,
  );
  await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
});

test("popover search also waits for an upload in the popover", async () => {
  const gate = pendingUpload();
  const search = vi.fn();
  render(
    <AutoSearch
      moreLayout="popover"
      mode="manual"
      fields={[
        {
          name: "file",
          label: "File",
          type: "upload",
          upload: gate.upload,
          search: { more: true },
        },
      ]}
      onSearch={search}
    />,
  );
  await userEvent.click(screen.getByTestId("rac-more-filters"));
  await chooseFile();
  await userEvent.click(
    document.querySelector<HTMLButtonElement>(
      ".auto-search-popover-panel .auto-primary",
    )!,
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  expect(search).not.toHaveBeenCalled();
  await act(async () => gate.resolve());
});

test.each(["instant", "manual"] as const)(
  "popover reset clears errors and emits once in %s mode",
  async (mode) => {
    const search = vi.fn();
    const change = vi.fn();
    render(
      <AutoSearch
        mode={mode}
        moreLayout="popover"
        fields={[
          { name: "name", label: "Name" },
          {
            name: "extra",
            label: "Extra",
            required: true,
            search: { more: true },
          },
        ]}
        onSearch={search}
        onChange={change}
      />,
    );
    await userEvent.click(screen.getByTestId("rac-more-filters"));
    await userEvent.click(
      document.querySelector<HTMLButtonElement>(
        ".auto-search-popover-panel .auto-primary",
      )!,
    );
    expect(await screen.findByText("Extra is required")).toBeVisible();
    await userEvent.click(
      document.querySelector<HTMLButtonElement>(
        ".auto-search-popover-actions button:not(.auto-primary)",
      )!,
    );
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    expect(change).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Extra is required")).toBeNull();
  },
);

test("main search validates more fields after the popover is closed", async () => {
  const search = vi.fn();
  render(
    <AutoSearch
      mode="manual"
      moreLayout="popover"
      fields={[
        { name: "name", label: "Name" },
        {
          name: "extra",
          label: "Extra",
          required: true,
          search: { more: true },
        },
      ]}
      onSearch={search}
    />,
  );
  await userEvent.click(screen.getByTestId("rac-search"));
  expect(await screen.findByText("Extra is required")).toBeVisible();
  expect(search).not.toHaveBeenCalled();
});
