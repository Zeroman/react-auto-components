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
        { name: "enabled", type: "switch", label: "启用", defaultValue: false },
        { name: "details", label: "详情", hidden: (v) => !v.enabled },
      ]}
    />,
  );
  expect(screen.queryByLabelText("详情")).not.toBeInTheDocument();
  await u.click(screen.getByRole("switch"));
  expect(screen.getByLabelText("详情")).toBeVisible();
});
test("cascader keeps path and checkbox preserves false", async () => {
  const u = userEvent.setup(),
    submit = vi.fn();
  render(
    <AutoForm
      fields={[
        {
          name: "path",
          label: "路径",
          type: "cascader",
          options: [
            {
              label: "根",
              value: 0,
              children: [{ label: "叶", value: false }],
            },
          ],
        },
        {
          name: "flags",
          label: "标志",
          type: "checkbox",
          options: [{ value: false, label: "否" }],
        },
      ]}
      onSubmit={submit}
    />,
  );
  await u.selectOptions(screen.getByLabelText("级联第 1 级"), "0");
  await u.selectOptions(screen.getByLabelText("级联第 2 级"), "0");
  await u.click(screen.getByLabelText("否"));
  await u.click(screen.getByText("提交"));
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith({ path: [0, false], flags: [false] }),
  );
});
test("float intermediate values are editable", async () => {
  const u = userEvent.setup();
  render(
    <AutoForm fields={[{ name: "amount", type: "float", label: "金额" }]} />,
  );
  const input = screen.getByLabelText("金额");
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
          label: "日期",
          type: "daterange",
          dateValue: "timestamp",
          defaultValue: [start, end],
        },
      ]}
      onSubmit={submit}
    />,
  );
  expect(screen.getByLabelText("日期开始")).toHaveValue("2026-09-01");
  await u.click(screen.getByText("提交"));
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
          label: "附件",
          type: "upload",
          upload: async () => {
            throw new Error("上传失败");
          },
        },
      ]}
    />,
  );
  await u.upload(
    screen.getByLabelText("附件"),
    new File(["a"], "a.txt", { type: "text/plain" }),
  );
  expect(await screen.findByText("上传失败")).toBeVisible();
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
          label: "姓名",
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
    finish("旧值无效");
    expect(await result).toBe(false);
  });
  expect(screen.queryByText("旧值无效")).not.toBeInTheDocument();
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
          label: "选择",
          options: Array.from({ length: 10000 }, (_, i) => ({
            value: i,
            label: `选项${i}`,
          })),
        },
      ]}
    />,
  );
  await u.click(screen.getByLabelText("选择"));
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
          label: "附件",
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
    screen.getByLabelText("附件"),
    new File(["a"], "a.txt", { type: "text/plain" }),
  );
  await u.click(screen.getByText("重置"));
  await act(async () => finish("late-upload"));
  expect(ref.current!.getValues().file).toBe("original");
  expect(signal.aborted).toBe(true);
  expect(screen.queryByText("上传中…")).not.toBeInTheDocument();
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
          label: "附件",
          upload: () =>
            new Promise<string>((resolve) => {
              finish = resolve;
            }),
        },
      ]}
      onSubmit={submit}
    />,
  );
  await u.upload(screen.getByLabelText("附件"), new File(["a"], "a.txt"));
  expect(screen.getByRole("button", { name: "提交" })).toBeDisabled();
  await act(async () => finish("uploaded"));
  await u.click(screen.getByRole("button", { name: "提交" }));
  expect(submit).toHaveBeenCalledWith({ file: "uploaded" });
});
