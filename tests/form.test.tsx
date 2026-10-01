import { test, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { AutoForm, type AutoFormHandle } from "../src/components/AutoForm";
test("required validation, hidden fields, submit and reset", async () => {
  const submit = vi.fn();
  const user = userEvent.setup();
  const ref = createRef<AutoFormHandle<{ name: string; hidden: string }>>();
  render(
    <AutoForm
      ref={ref}
      fields={[
        { name: "name", label: "姓名", required: true, defaultValue: "" },
        { name: "hidden", label: "隐藏", required: true, hidden: true },
      ]}
      onSubmit={submit}
    />,
  );
  await user.click(screen.getByRole("button", { name: "提交" }));
  expect(submit).not.toHaveBeenCalled();
  expect(await screen.findByText("姓名为必填项")).toBeVisible();
  await user.type(screen.getByRole("textbox", { name: "姓名" }), "张三");
  await user.click(screen.getByRole("button", { name: "提交" }));
  await waitFor(() => expect(submit).toHaveBeenCalled());
  await user.click(screen.getByRole("button", { name: "重置" }));
  expect(screen.getByRole("textbox", { name: "姓名" })).toHaveValue("");
});
test("controlled values update without echoing onChange", async () => {
  const onChange = vi.fn();
  const fields = [{ name: "name" as const, label: "姓名" }];
  const { rerender } = render(
    <AutoForm fields={fields} value={{ name: "甲" }} onChange={onChange} />,
  );
  rerender(
    <AutoForm fields={fields} value={{ name: "乙" }} onChange={onChange} />,
  );
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "姓名" })).toHaveValue("乙"),
  );
  expect(onChange).not.toHaveBeenCalled();
});
test("select preserves falsy identity", async () => {
  const submit = vi.fn();
  const user = userEvent.setup();
  render(
    <AutoForm
      fields={[
        {
          name: "status",
          label: "状态",
          type: "select",
          options: [
            { value: false, label: "否" },
            { value: 0, label: "零" },
          ],
        },
      ]}
      onSubmit={submit}
    />,
  );
  await user.selectOptions(screen.getByLabelText("状态"), "1");
  await user.click(screen.getByText("提交"));
  await waitFor(() => expect(submit).toHaveBeenCalledWith({ status: 0 }));
});

test("controlled parent may reject an edit without changing its value reference", async () => {
  const u = userEvent.setup(),
    change = vi.fn();
  const ref = createRef<AutoFormHandle<{ name: string }>>();
  const value = { name: "accepted" };
  render(
    <AutoForm
      ref={ref}
      fields={[{ name: "name", label: "姓名" }]}
      value={value}
      onChange={change}
    />,
  );
  await u.type(screen.getByLabelText("姓名"), "x");
  expect(change).toHaveBeenCalledWith({ name: "acceptedx" });
  await waitFor(() =>
    expect(screen.getByLabelText("姓名")).toHaveValue("accepted"),
  );
  expect(ref.current!.getValues()).toEqual(value);
});

test("controlled normalization preserves focus and subsequent typing", async () => {
  const { useState } = await import("react");
  function Harness() {
    const [value, setValue] = useState({ name: "" });
    return (
      <AutoForm
        fields={[{ name: "name", label: "姓名" }]}
        value={value}
        onChange={(next) => setValue({ name: next.name.toUpperCase() })}
      />
    );
  }
  render(<Harness />);
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("姓名"), "abc");
  expect(screen.getByLabelText("姓名")).toHaveValue("ABC");
  expect(screen.getByLabelText("姓名")).toHaveFocus();
});
