import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutoConfigProvider } from "../src/core/AutoConfigProvider";
import { AutoForm } from "../src/components/AutoForm";
import { AutoSearchPanel } from "../src/components/AutoSearchPanel";
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
      <AutoForm fields={[{ name: "name", label: "全局表单" }]} />
      <AutoConfigProvider config={{ form: { density: "comfortable" } }}>
        <AutoSearchPanel
          fields={[{ name: "query", label: "嵌套搜索" }]}
          onSearch={() => {}}
        />
        <AutoForm
          fields={[{ name: "name", label: "局部覆盖" }]}
          labelPosition="top"
          labelAlign="left"
          labelWidth={160}
        />
      </AutoConfigProvider>
    </AutoConfigProvider>,
  );
  const outer = screen.getByLabelText("全局表单").closest("form")!;
  expect(outer).toHaveAttribute("data-label-position", "left");
  expect(outer).toHaveAttribute("data-label-align", "right");
  expect(outer).toHaveAttribute("data-density", "compact");
  const nested = screen.getByLabelText("嵌套搜索").closest("form")!;
  expect(nested).toHaveAttribute("data-label-position", "left");
  expect(nested).toHaveAttribute("data-label-align", "right");
  expect(nested).toHaveAttribute("data-density", "comfortable");
  expect(nested.style.getPropertyValue("--auto-label-width")).toBe("112px");
  const override = screen.getByLabelText("局部覆盖").closest("form")!;
  expect(override).toHaveAttribute("data-label-position", "top");
  expect(override).toHaveAttribute("data-label-align", "left");
  expect(override.style.getPropertyValue("--auto-label-width")).toBe("160px");
});

test("without a provider forms and search panels share the stacked default", () => {
  render(
    <>
      <AutoForm fields={[{ name: "name", label: "默认表单" }]} />
      <AutoSearchPanel
        fields={[{ name: "query", label: "默认搜索" }]}
        onSearch={() => {}}
      />
    </>,
  );
  for (const label of ["默认表单", "默认搜索"]) {
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
      <AutoTabs items={[{ id: "t1", label: "标签一", content: "内容一" }]} />
      <AutoTable
        id="test-table"
        data={[{ id: "1", name: "张三" }]}
        rowKey="id"
        columns={[{ key: "name", label: "姓名" }]}
        virtual={false}
      />
      <AutoForm fields={[{ name: "user", label: "用户" }]} />
      <AutoSearchPanel
        fields={[{ name: "q", label: "查询" }]}
        onSearch={() => {}}
      />
      <AutoTabs
        size="small"
        density="comfortable"
        items={[{ id: "t2", label: "小标签", content: "小内容" }]}
      />
      <AutoTable
        id="small-table"
        size="small"
        density="comfortable"
        data={[{ id: "1", name: "李四" }]}
        rowKey="id"
        columns={[{ key: "name", label: "姓名" }]}
        virtual={false}
      />
    </AutoConfigProvider>,
  );

  const tabs = screen.getAllByLabelText("页面标签");
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

  const form = screen.getByLabelText("用户").closest("form")!;
  expect(form).toHaveAttribute("data-size", "large");
  expect(form).toHaveAttribute("data-density", "compact");

  const search = screen.getByLabelText("查询").closest(".auto-search")!;
  expect(search).toHaveAttribute("data-size", "large");
  expect(search).toHaveAttribute("data-density", "compact");
});

test("adaptive label width defaults to auto and respects custom width overrides", () => {
  render(
    <>
      <AutoForm fields={[{ name: "user", label: "自适应表单" }]} />
      <AutoSearchPanel
        fields={[{ name: "q", label: "自适应搜索" }]}
        onSearch={() => {}}
      />
      <AutoForm
        fields={[{ name: "fixed", label: "固定表单" }]}
        labelWidth={140}
      />
      <AutoSearchPanel
        fields={[{ name: "fixedSearch", label: "固定搜索" }]}
        labelWidth={120}
        onSearch={() => {}}
      />
    </>,
  );

  const autoForm = screen.getByLabelText("自适应表单").closest("form")!;
  expect(autoForm).toHaveAttribute("data-label-width", "auto");

  const autoSearch = screen
    .getByLabelText("自适应搜索")
    .closest(".auto-search")!;
  expect(autoSearch).toHaveAttribute("data-label-width", "auto");

  const fixedForm = screen.getByLabelText("固定表单").closest("form")!;
  expect(fixedForm).toHaveAttribute("data-label-width", "140px");
  expect(fixedForm.style.getPropertyValue("--auto-label-width")).toBe("140px");

  const fixedSearch = screen
    .getByLabelText("固定搜索")
    .closest(".auto-search")!;
  expect(fixedSearch).toHaveAttribute("data-label-width", "120px");
});

test("automatic left labels render when the host has no Range geometry API", () => {
  render(
    <AutoForm
      fields={[{ name: "plain", label: "无布局测量环境" }]}
      labelPosition="left"
    />,
  );
  expect(screen.getByRole("textbox", { name: "无布局测量环境" })).toBeVisible();
});
