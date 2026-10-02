import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutoConfigProvider } from "../src/core/AutoConfigProvider";
import { AutoForm } from "../src/components/AutoForm";
import { AutoSearch } from "../src/components/AutoSearch";
import { AutoTable } from "../src/components/AutoTable";
import { AutoTabs } from "../src/components/AutoTabs";

test("nested layout configuration merges per property and component props take priority", () => {
  render(
    <AutoConfigProvider
      config={{
        form: {
          labelPosition: "left",
          labelAlign: "right",
          labelWidth: 112,
          density: "compact",
        },
      }}
    >
      <AutoForm fields={[{ name: "name", label: "Global form" }]} />
      <AutoConfigProvider config={{ form: { density: "comfortable" } }}>
        <AutoSearch
          fields={[{ name: "query", label: "Nested search" }]}
          onSearch={() => {}}
        />
        <AutoForm
          fields={[{ name: "name", label: "Local override" }]}
          labelPosition="top"
          labelAlign="left"
          labelWidth={160}
        />
      </AutoConfigProvider>
    </AutoConfigProvider>,
  );
  const outer = screen.getByLabelText("Global form").closest("form")!;
  expect(outer).toHaveAttribute("data-label-position", "left");
  expect(outer).toHaveAttribute("data-label-align", "right");
  expect(outer).toHaveAttribute("data-density", "compact");
  const nested = screen.getByLabelText("Nested search").closest("form")!;
  expect(nested).toHaveAttribute("data-label-position", "left");
  expect(nested).toHaveAttribute("data-label-align", "right");
  expect(nested).toHaveAttribute("data-density", "comfortable");
  expect(nested.style.getPropertyValue("--auto-label-width")).toBe("112px");
  const override = screen.getByLabelText("Local override").closest("form")!;
  expect(override).toHaveAttribute("data-label-position", "top");
  expect(override).toHaveAttribute("data-label-align", "left");
  expect(override.style.getPropertyValue("--auto-label-width")).toBe("160px");
});

test("without a provider forms and search panels share the stacked default", () => {
  render(
    <>
      <AutoForm fields={[{ name: "name", label: "Default form" }]} />
      <AutoSearch
        fields={[{ name: "query", label: "Default search" }]}
        onSearch={() => {}}
      />
    </>,
  );
  for (const label of ["Default form", "Default search"]) {
    const form = screen.getByLabelText(label).closest("form");
    expect(form).toHaveAttribute("data-label-position", "top");
    expect(form).toHaveAttribute("data-density", "comfortable");
  }
});

test("global size and density apply to tabs, tables, forms and panels with local overrides", () => {
  render(
    <AutoConfigProvider
      config={{
        size: "large",
        density: "compact",
        table: { density: "compact", size: "large" },
        tabs: { density: "compact", size: "large" },
      }}
    >
      <AutoTabs
        items={[{ id: "t1", label: "Tab one", content: "Content one" }]}
      />
      <AutoTable
        id="test-table"
        data={[{ id: "1", name: "Zhang San" }]}
        rowKey="id"
        columns={[{ key: "name", label: "Name" }]}
        virtual={false}
      />
      <AutoForm fields={[{ name: "user", label: "User" }]} />
      <AutoSearch
        fields={[{ name: "q", label: "Query" }]}
        onSearch={() => {}}
      />
      <AutoTabs
        size="small"
        density="comfortable"
        items={[{ id: "t2", label: "Small tab", content: "Small content" }]}
      />
      <AutoTable
        id="small-table"
        size="small"
        density="comfortable"
        data={[{ id: "1", name: "Li Si" }]}
        rowKey="id"
        columns={[{ key: "name", label: "Name" }]}
        virtual={false}
      />
    </AutoConfigProvider>,
  );

  const tabs = screen.getAllByLabelText("Tabs");
  const defaultTabRoot = tabs[0].closest(".auto-tabs")!;
  expect(defaultTabRoot).toHaveAttribute("data-size", "large");
  expect(defaultTabRoot).toHaveAttribute("data-density", "compact");

  const overrideTabRoot = tabs[1].closest(".auto-tabs")!;
  expect(overrideTabRoot).toHaveAttribute("data-size", "small");
  expect(overrideTabRoot).toHaveAttribute("data-density", "comfortable");

  const tables = document.querySelectorAll(".auto-table");
  expect(tables[0]).toHaveAttribute("data-size", "large");
  expect(tables[0]).toHaveAttribute("data-density", "compact");
  expect(tables[1]).toHaveAttribute("data-size", "small");
  expect(tables[1]).toHaveAttribute("data-density", "comfortable");

  const form = screen.getByLabelText("User").closest("form")!;
  expect(form).toHaveAttribute("data-size", "large");
  expect(form).toHaveAttribute("data-density", "compact");

  const search = screen.getByLabelText("Query").closest(".auto-search")!;
  expect(search).toHaveAttribute("data-size", "large");
  expect(search).toHaveAttribute("data-density", "compact");
});

test("adaptive label width defaults to auto and respects custom width overrides", () => {
  render(
    <>
      <AutoForm fields={[{ name: "user", label: "Adaptive form" }]} />
      <AutoSearch
        fields={[{ name: "q", label: "Adaptive search" }]}
        onSearch={() => {}}
      />
      <AutoForm
        fields={[{ name: "fixed", label: "Fixed form" }]}
        labelWidth={140}
      />
      <AutoSearch
        fields={[{ name: "fixedSearch", label: "Fixed search" }]}
        labelWidth={120}
        onSearch={() => {}}
      />
    </>,
  );

  const autoForm = screen.getByLabelText("Adaptive form").closest("form")!;
  expect(autoForm).toHaveAttribute("data-label-width", "auto");

  const autoSearch = screen
    .getByLabelText("Adaptive search")
    .closest(".auto-search")!;
  expect(autoSearch).toHaveAttribute("data-label-width", "auto");

  const fixedForm = screen.getByLabelText("Fixed form").closest("form")!;
  expect(fixedForm).toHaveAttribute("data-label-width", "140px");
  expect(fixedForm.style.getPropertyValue("--auto-label-width")).toBe("140px");

  const fixedSearch = screen
    .getByLabelText("Fixed search")
    .closest(".auto-search")!;
  expect(fixedSearch).toHaveAttribute("data-label-width", "120px");
});

test("automatic left labels render when the host has no Range geometry API", () => {
  render(
    <AutoForm
      fields={[{ name: "plain", label: "No layout measurement" }]}
      labelPosition="left"
    />,
  );
  expect(
    screen.getByRole("textbox", { name: "No layout measurement" }),
  ).toBeVisible();
});
