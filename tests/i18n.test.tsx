import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AutoConfigProvider, AutoForm, AutoTable } from "../src";
import {
  detectLocale,
  isPreference,
  translateMessage,
} from "../test-project/src/locale";

describe("demo language resolution", () => {
  it("matches supported browser languages in priority order with an English fallback", () => {
    expect(detectLocale(["it-IT", "fr-CA", "en-US"])).toBe("fr");
    expect(detectLocale(["zh-HK"])).toBe("zh-TW");
    expect(detectLocale(["zh-Hant-CN"])).toBe("zh-TW");
    expect(detectLocale(["zh-Hans-TW"])).toBe("zh-CN");
    expect(detectLocale(["pt-PT"])).toBe("pt-BR");
    expect(detectLocale(["ja-JP"])).toBe("ja");
    expect(detectLocale(["it-IT"])).toBe("en");
    expect(detectLocale([])).toBe("en");
    expect(isPreference("__proto__")).toBe(false);
    expect(isPreference("auto")).toBe(true);
  });

  it("translates UI and stable demo data while preserving unknown user text", () => {
    expect(translateMessage("en", "搜索")).toBe("Search");
    expect(translateMessage("zh-CN", "Customer Data Platform 42")).toBe(
      "客户数据平台 42",
    );
    expect(translateMessage("en", "My custom project")).toBe(
      "My custom project",
    );
  });
});

it("switches built-in form messages through t without clearing edits or overriding custom labels", () => {
  const dict: Record<string, string> = {
    提交: "Submit",
    重置: "Reset",
    "{0}为必填项": "{0} is required",
  };
  const t = (key: string, fallback?: string) => dict[key] ?? fallback ?? key;
  const view = (translated: boolean) => (
    <AutoConfigProvider config={translated ? { t } : {}}>
      <AutoForm fields={[{ name: "name", label: "Name", required: true }]} />
    </AutoConfigProvider>
  );
  const { rerender } = render(view(false));
  fireEvent.change(screen.getByLabelText(/Name/), {
    target: { value: "Keep this draft" },
  });
  rerender(view(true));
  expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  expect(screen.getByLabelText(/Name/)).toHaveValue("Keep this draft");
  rerender(
    <AutoConfigProvider config={{ t }}>
      <AutoForm fields={[]} submitLabel="Custom save" />
    </AutoConfigProvider>,
  );
  expect(
    screen.getByRole("button", { name: "Custom save" }),
  ).toBeInTheDocument();
});

it("isolates translations between providers and uses interpolated table messages", () => {
  const t = (key: string) =>
    ({ "{0} 条记录": "Records: {0}", 刷新: "Refresh", 设置: "Settings" })[
      key
    ] ?? key;
  render(
    <>
      <AutoConfigProvider config={{ t }}>
        <AutoTable
          id="translated"
          rowKey="name"
          columns={[{ key: "name", label: "Name" }]}
          data={[{ name: "A" }]}
        />
      </AutoConfigProvider>
      <AutoTable<{ name: string }>
        id="default"
        rowKey="name"
        columns={[{ key: "name", label: "Name" }]}
        data={[]}
      />
    </>,
  );
  expect(screen.getByText("Records: 1")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "刷新" })).toBeInTheDocument();
});
