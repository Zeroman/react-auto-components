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

test("display items render cleanly and are skipped during validation and submit", async () => {
  const submit = vi.fn();
  const action = vi.fn();
  const user = userEvent.setup();
  render(
    <AutoForm<{ username: string }>
      fields={[
        { type: "title", label: "User Registration" },
        { type: "tip", content: "Please fill in your details below." },
        { type: "divider" },
        { name: "username", label: "Username", required: true },
        { type: "button", label: "Click Me", onAction: action },
      ]}
      onSubmit={submit}
    />,
  );
  expect(screen.getByText("User Registration")).toBeVisible();
  expect(screen.getByText("Please fill in your details below.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Click Me" })).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Click Me" }));
  expect(action).toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Submit" }));
  expect(submit).not.toHaveBeenCalled();
  expect(await screen.findByText("Username is required")).toBeVisible();

  await user.type(screen.getByRole("textbox", { name: "Username" }), "alice");
  await user.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith({ username: "alice" }),
  );
});

test("slot classNames and styles apply to form and fields", () => {
  const { container } = render(
    <AutoForm<{ email: string }>
      classNames={{
        form: "custom-form-root",
        grid: "custom-grid",
        submit: "custom-submit-btn",
        input: "custom-global-input",
      }}
      styles={{
        form: { padding: "20px" },
      }}
      fields={[
        {
          name: "email",
          label: "Email Address",
          classNames: {
            root: "email-field-root",
            input: "email-specific-input",
            label: "email-custom-label",
          },
        },
      ]}
    />,
  );

  const formEl = container.querySelector("form");
  expect(formEl).toHaveClass("custom-form-root");
  expect(formEl).toHaveStyle({ padding: "20px" });

  const gridEl = container.querySelector(".auto-form-grid");
  expect(gridEl).toHaveClass("custom-grid");

  const submitBtn = screen.getByRole("button", { name: "Submit" });
  expect(submitBtn).toHaveClass("custom-submit-btn");

  const inputEl = screen.getByLabelText("Email Address");
  expect(inputEl).toHaveClass("custom-global-input");
  expect(inputEl).toHaveClass("email-specific-input");

  const labelEl = container.querySelector("label");
  expect(labelEl).toHaveClass("email-custom-label");
});

test("virtual-select and virtual choice field render and update form value", async () => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(220);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(300);
  const submit = vi.fn();
  const user = userEvent.setup();
  render(
    <AutoForm<{ role: string; tag: string }>
      fields={[
        {
          name: "role",
          label: "Role",
          type: "virtual-select",
          options: [
            { value: "admin", label: "Admin Role" },
            { value: "user", label: "User Role" },
          ],
        },
        {
          name: "tag",
          label: "Tag",
          type: "select",
          virtual: true,
          options: [
            { value: "frontend", label: "Frontend" },
            { value: "backend", label: "Backend" },
          ],
        },
      ]}
      onSubmit={submit}
    />,
  );

  const roleButton = screen.getByLabelText("Role");
  await user.click(roleButton);
  await user.click(screen.getByText("Admin Role"));

  const tagButton = screen.getByLabelText("Tag");
  await user.click(tagButton);
  await user.click(screen.getByText("Backend"));

  await user.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith({ role: "admin", tag: "backend" }),
  );
});
