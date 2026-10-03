import { expect, test } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoForm } from "../src/components/AutoForm";

test("field help describes the input before focus and merges validation errors", async () => {
  const user = userEvent.setup();
  render(
    <AutoForm
      fields={[
        {
          name: "name",
          label: "Name",
          required: true,
          tip: "Use your full name",
        },
      ]}
    />,
  );
  const input = screen.getByRole("textbox", { name: "Name" });
  expect(input).toHaveAccessibleDescription("Use your full name");
  const helpId = input.getAttribute("aria-describedby");
  await user.click(screen.getByRole("button", { name: "Submit" }));
  expect(input).toHaveAccessibleDescription(
    "Use your full name Name is required",
  );
  await user.type(input, "Ada");
  expect(input).toHaveAccessibleDescription("Use your full name");
  expect(input).toHaveAttribute("aria-describedby", helpId);
});

test("keyboard focus and editing keep help visible without an extra label tab stop", async () => {
  const user = userEvent.setup();
  render(
    <AutoForm
      fields={[{ name: "name", label: "Name", tip: "Use your full name" }]}
    />,
  );
  const input = screen.getByRole("textbox", { name: "Name" });
  await user.tab();
  expect(input).toHaveFocus();
  expect(await screen.findByRole("tooltip")).toHaveTextContent(
    "Use your full name",
  );
  await user.keyboard("Ada");
  expect(screen.getByRole("tooltip")).toBeVisible();
  expect(input).toHaveValue("Ada");
  await user.tab();
  await waitFor(() =>
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
  );
});

test("all range and choice controls expose their field help", async () => {
  const user = userEvent.setup();
  render(
    <AutoForm
      fields={[
        {
          name: "dates",
          label: "Dates",
          type: "daterange",
          tip: "Choose the period",
        },
        {
          name: "radio",
          label: "Radio",
          type: "radio",
          tip: "Choose one",
          options: [{ label: "First", value: "first" }],
        },
        {
          name: "checks",
          label: "Checks",
          type: "checkbox",
          tip: "Choose any",
          options: [{ label: "Second", value: "second" }],
        },
        {
          name: "city",
          label: "City",
          type: "cascader",
          tip: "Choose a city",
          defaultValue: ["country"],
          options: [
            {
              label: "Country",
              value: "country",
              children: [{ label: "City", value: "city" }],
            },
          ],
        },
        {
          name: "virtual",
          label: "Virtual",
          type: "virtual-select",
          tip: "Search for an option",
          options: [{ label: "Option", value: "option" }],
        },
      ]}
    />,
  );
  expect(screen.getByLabelText("Dates start")).toHaveAccessibleDescription(
    "Choose the period",
  );
  expect(screen.getByLabelText("Dates end")).toHaveAccessibleDescription(
    "Choose the period",
  );
  expect(
    screen.getByRole("radio", { name: "First" }),
  ).toHaveAccessibleDescription("Choose one");
  expect(
    screen.getByRole("checkbox", { name: "Second" }),
  ).toHaveAccessibleDescription("Choose any");
  expect(screen.getByLabelText("Cascader level 1")).toHaveAccessibleDescription(
    "Choose a city",
  );
  expect(screen.getByLabelText("Cascader level 2")).toHaveAccessibleDescription(
    "Choose a city",
  );
  const select = screen.getByRole("button", { name: "Virtual" });
  expect(select).toHaveAccessibleDescription("Search for an option");
  await user.click(select);
  expect(
    screen.getByRole("textbox", { name: "Search options" }),
  ).toHaveAccessibleDescription("Search for an option");
});

test("range help remains open when focus moves between its controls", async () => {
  const user = userEvent.setup();
  render(
    <AutoForm
      fields={[
        {
          name: "dates",
          label: "Dates",
          type: "daterange",
          tip: "Choose the period",
        },
      ]}
    />,
  );
  await user.tab();
  expect(screen.getByLabelText("Dates start")).toHaveFocus();
  expect(await screen.findByRole("tooltip")).toHaveTextContent(
    "Choose the period",
  );
  await user.tab();
  expect(screen.getByLabelText("Dates end")).toHaveFocus();
  expect(screen.getByRole("tooltip")).toBeVisible();
});

test("custom renderers can apply the combined field description", async () => {
  const user = userEvent.setup();
  render(
    <AutoForm
      fields={[
        {
          name: "custom",
          label: "Custom",
          required: true,
          tip: "Custom help",
          render: (context) => (
            <input id={context.id} aria-describedby={context.describedBy} />
          ),
        },
      ]}
    />,
  );
  const input = screen.getByRole("textbox", { name: "Custom" });
  expect(input).toHaveAccessibleDescription("Custom help");
  await user.click(screen.getByRole("button", { name: "Submit" }));
  expect(input).toHaveAccessibleDescription("Custom help Custom is required");
});
