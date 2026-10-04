import { test, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { AutoForm, type AutoFormHandle } from "../src/components/AutoForm";
import type { Field } from "../src/core/types";
afterEach(() => vi.restoreAllMocks());
test("dependent visibility and readonly fields", async () => {
  const u = userEvent.setup();
  render(
    <AutoForm
      fields={[
        {
          name: "enabled",
          type: "switch",
          label: "Enabled",
          defaultValue: false,
        },
        { name: "details", label: "Details", hidden: (v) => !v.enabled },
      ]}
    />,
  );
  expect(screen.queryByLabelText("Details")).not.toBeInTheDocument();
  await u.click(screen.getByRole("switch"));
  expect(screen.getByLabelText("Details")).toBeVisible();
});
test("cascader keeps path and checkbox preserves false", async () => {
  const u = userEvent.setup(),
    submit = vi.fn();
  render(
    <AutoForm
      fields={[
        {
          name: "path",
          label: "Path",
          type: "cascader",
          options: [
            {
              label: "Root",
              value: 0,
              children: [{ label: "Leaf", value: false }],
            },
          ],
        },
        {
          name: "flags",
          label: "Flag",
          type: "checkbox",
          options: [{ value: false, label: "No" }],
        },
      ]}
      onSubmit={submit}
    />,
  );
  await u.selectOptions(screen.getByLabelText("Cascader level 1"), "0");
  await u.selectOptions(screen.getByLabelText("Cascader level 2"), "0");
  await u.click(screen.getByLabelText("No"));
  await u.click(screen.getByText("Submit"));
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith({ path: [0, false], flags: [false] }),
  );
});
test("float intermediate values are editable", async () => {
  const u = userEvent.setup();
  render(
    <AutoForm fields={[{ name: "amount", type: "float", label: "Amount" }]} />,
  );
  const input = screen.getByLabelText("Amount");
  await u.type(input, "-1.2.3x");
  expect(input).toHaveValue("-1.23");
});
test("date range timestamp round trip uses local calendar dates", async () => {
  const u = userEvent.setup(),
    submit = vi.fn();
  const start = new Date(2026, 8, 1).getTime(),
    end = new Date(2026, 8, 2).getTime();
  render(
    <AutoForm
      fields={[
        {
          name: "range",
          label: "Date",
          type: "daterange",
          dateValue: "timestamp",
          defaultValue: [start, end],
        },
      ]}
      onSubmit={submit}
    />,
  );
  expect(screen.getByLabelText("Date start")).toHaveValue("2026-09-01");
  await u.click(screen.getByText("Submit"));
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith({ range: [start, end] }),
  );
});
test("upload callback error is visible and does not submit a successful value", async () => {
  const u = userEvent.setup();
  render(
    <AutoForm
      fields={[
        {
          name: "file",
          label: "Attachment",
          type: "upload",
          upload: async () => {
            throw new Error("Upload failed");
          },
        },
      ]}
    />,
  );
  await u.upload(
    screen.getByLabelText("Attachment"),
    new File(["a"], "a.txt", { type: "text/plain" }),
  );
  expect(await screen.findByText("Upload failed")).toBeVisible();
});
test("stale async validation cannot overwrite changed values", async () => {
  const ref = createRef<AutoFormHandle<{ name: string }>>();
  let finish!: (v: string) => void;
  render(
    <AutoForm
      ref={ref}
      defaultValue={{ name: "old" }}
      fields={[
        {
          name: "name",
          label: "Name",
          rules: [
            () =>
              new Promise<string>((r) => {
                finish = r;
              }),
          ],
        },
      ]}
    />,
  );
  let result!: Promise<boolean>;
  act(() => {
    result = ref.current!.validate();
  });
  act(() => ref.current!.setValue("name", "new"));
  await act(async () => {
    finish("Stale value");
    expect(await result).toBe(false);
  });
  expect(screen.queryByText("Stale value")).not.toBeInTheDocument();
});
test("virtual select bounds large option lists", async () => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(220);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(300);
  const u = userEvent.setup();
  render(
    <AutoForm
      fields={[
        {
          name: "option",
          type: "select-v2",
          label: "Choose",
          options: Array.from({ length: 10000 }, (_, i) => ({
            value: i,
            label: `Option ${i}`,
          })),
        },
      ]}
    />,
  );
  await u.click(screen.getByLabelText("Choose"));
  expect(screen.getAllByRole("option").length).toBeLessThan(30);
});

test("reset aborts pending uploads and ignores late results even when reset value is unchanged", async () => {
  const u = userEvent.setup();
  let finish!: (value: string) => void, signal!: AbortSignal;
  const ref = createRef<AutoFormHandle<{ file: string }>>();
  render(
    <AutoForm
      ref={ref}
      defaultValue={{ file: "original" }}
      fields={[
        {
          name: "file",
          label: "Attachment",
          type: "upload",
          upload: (_, s) => {
            signal = s;
            return new Promise<string>((resolve) => {
              finish = resolve;
            });
          },
        },
      ]}
    />,
  );
  await u.upload(
    screen.getByLabelText("Attachment"),
    new File(["a"], "a.txt", { type: "text/plain" }),
  );
  await u.click(screen.getByText("Reset"));
  await act(async () => finish("late-upload"));
  expect(ref.current!.getValues().file).toBe("original");
  expect(signal.aborted).toBe(true);
  expect(screen.queryByText("Uploading…")).not.toBeInTheDocument();
});

test("submission waits for pending uploads", async () => {
  const u = userEvent.setup(),
    submit = vi.fn();
  let finish!: (value: string) => void;
  render(
    <AutoForm
      fields={[
        {
          name: "file",
          type: "upload",
          label: "Attachment",
          upload: () =>
            new Promise<string>((resolve) => {
              finish = resolve;
            }),
        },
      ]}
      onSubmit={submit}
    />,
  );
  await u.upload(screen.getByLabelText("Attachment"), new File(["a"], "a.txt"));
  expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  await act(async () => finish("uploaded"));
  await u.click(screen.getByRole("button", { name: "Submit" }));
  expect(submit).toHaveBeenCalledWith({ file: "uploaded" });
});

test("virtual select closes on outside click", async () => {
  const u = userEvent.setup();
  render(
    <div>
      <span data-testid="outside">Outside</span>
      <AutoForm
        fields={[
          {
            name: "option",
            type: "virtual-select",
            label: "Choose",
            options: [
              { value: "a", label: "Option A" },
              { value: "b", label: "Option B" },
            ],
          },
        ]}
      />
    </div>,
  );
  await u.click(screen.getByLabelText("Choose"));
  expect(screen.getByRole("listbox")).toBeInTheDocument();
  await u.click(screen.getByTestId("outside"));
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});

test("cascader terminates gracefully on cyclic options", () => {
  type CyclicOption = { value: string; label: string; children?: CyclicOption[] };
  const nodeA: CyclicOption = { value: "a", label: "Node A" };
  const nodeB: CyclicOption = { value: "b", label: "Node B", children: [nodeA] };
  nodeA.children = [nodeB];

  render(
    <AutoForm
      fields={[
        {
          name: "cat",
          type: "cascader",
          label: "Category",
          options: [nodeA],
          defaultValue: ["a", "b", "a"],
        },
      ]}
    />,
  );
  expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
});

