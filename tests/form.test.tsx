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
        { name: "name", label: "Name", required: true, defaultValue: "" },
        { name: "hidden", label: "Hidden", required: true, hidden: true },
      ]}
      onSubmit={submit}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Submit" }));
  expect(submit).not.toHaveBeenCalled();
  expect(await screen.findByText("Name is required")).toBeVisible();
  await user.type(screen.getByRole("textbox", { name: "Name" }), "Zhang San");
  await user.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(submit).toHaveBeenCalled());
  await user.click(screen.getByRole("button", { name: "Reset" }));
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
});
test("controlled values update without echoing onChange", async () => {
  const onChange = vi.fn();
  const fields = [{ name: "name" as const, label: "Name" }];
  const { rerender } = render(
    <AutoForm fields={fields} value={{ name: "A" }} onChange={onChange} />,
  );
  rerender(
    <AutoForm fields={fields} value={{ name: "B" }} onChange={onChange} />,
  );
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("B"),
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
          label: "Status",
          type: "select",
          options: [
            { value: false, label: "No" },
            { value: 0, label: "Zero" },
          ],
        },
      ]}
      onSubmit={submit}
    />,
  );
  await user.selectOptions(screen.getByLabelText("Status"), "1");
  await user.click(screen.getByText("Submit"));
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
      fields={[{ name: "name", label: "Name" }]}
      value={value}
      onChange={change}
    />,
  );
  await u.type(screen.getByLabelText("Name"), "x");
  expect(change).toHaveBeenCalledWith({ name: "acceptedx" });
  await waitFor(() =>
    expect(screen.getByLabelText("Name")).toHaveValue("accepted"),
  );
  expect(ref.current!.getValues()).toEqual(value);
});

test("controlled normalization preserves focus and subsequent typing", async () => {
  const { useState } = await import("react");
  function Harness() {
    const [value, setValue] = useState({ name: "" });
    return (
      <AutoForm
        fields={[{ name: "name", label: "Name" }]}
        value={value}
        onChange={(next) => setValue({ name: next.name.toUpperCase() })}
      />
    );
  }
  render(<Harness />);
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("Name"), "abc");
  expect(screen.getByLabelText("Name")).toHaveValue("ABC");
  expect(screen.getByLabelText("Name")).toHaveFocus();
});
