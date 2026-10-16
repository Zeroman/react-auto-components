import { test, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { AutoForm, type AutoFormHandle } from "../src/components/AutoForm";
import { defaults, equal } from "../src/core/config";

test("required daterange needs both endpoints", async () => {
  const submit = vi.fn();
  const { rerender } = render(
    <AutoForm
      fields={[
        { name: "d", label: "Range", type: "daterange", required: true },
      ]}
      value={{ d: [null, null] as (string | null)[] }}
      onSubmit={submit}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Submit" }));
  expect(await screen.findByText("Range is required")).toBeVisible();
  expect(submit).not.toHaveBeenCalled();

  // Half-open passes the range forward but still fails required.
  rerender(
    <AutoForm
      fields={[
        { name: "d", label: "Range", type: "daterange", required: true },
      ]}
      value={{ d: ["2025-01-01", null] }}
      onSubmit={submit}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Submit" }));
  expect(await screen.findByText("Range is required")).toBeVisible();

  rerender(
    <AutoForm
      fields={[
        { name: "d", label: "Range", type: "daterange", required: true },
      ]}
      value={{ d: ["2025-01-01", "2025-12-31"] }}
      onSubmit={submit}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  expect(screen.queryByText("Range is required")).toBeNull();
});

test("required plain arrays keep length-only semantics (null entries allowed)", async () => {
  const submit = vi.fn();
  render(
    <AutoForm
      fields={[
        {
          name: "tags",
          label: "Tags",
          required: true,
        } as never,
      ]}
      value={{ tags: [null, "a"] as unknown[] }}
      onSubmit={submit}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
});

test("focus reaches textarea and virtual-select controls", async () => {
  const ref = createRef<AutoFormHandle<{ bio: string; role: string }>>();
  render(
    <AutoForm<{ bio: string; role: string }>
      ref={ref}
      fields={[
        { name: "bio", label: "Bio", type: "textarea" },
        {
          name: "role",
          label: "Role",
          type: "virtual-select",
          options: [{ value: "a", label: "A" }],
        },
      ]}
    />,
  );
  ref.current!.focus("bio");
  expect(screen.getByLabelText("Bio")).toHaveFocus();
  ref.current!.focus("role");
  expect(screen.getByRole("button", { name: "Role" })).toHaveFocus();
});

test("date range inputs label themselves from the effective label", () => {
  render(
    <AutoForm
      fields={[{ name: "d", type: "daterange" }]}
      value={{ d: [null, null] }}
    />,
  );
  expect(screen.queryByLabelText(/undefined/)).toBeNull();
  expect(screen.getByLabelText("d start")).toBeInTheDocument();
  expect(screen.getByLabelText("d end")).toBeInTheDocument();
});

test("defaults skips undefined initial entries so field defaults survive", () => {
  const fields = [{ name: "role", defaultValue: "guest" }];
  expect(defaults(fields, { role: undefined })).toEqual({ role: "guest" });
  expect(defaults(fields, { role: "admin" })).toEqual({ role: "admin" });
});

test("defaults clones nested plain objects and arrays from initial", () => {
  const nested = { tags: ["a"], since: new Date(0) };
  const file = new File(["x"], "f.txt");
  const value = defaults([] as { name?: string }[], { nested, file } as never);
  const cloned = (value as { nested: typeof nested }).nested;
  expect(cloned).toEqual(nested);
  expect(cloned).not.toBe(nested);
  expect(cloned.tags).not.toBe(nested.tags);
  expect(cloned.since).not.toBe(nested.since);
  expect(cloned.since.getTime()).toBe(0);
  // Opaque values keep identity on purpose (uploads must stay usable).
  expect((value as { file: unknown }).file).toBe(file);
});

test("cyclic initial values do not hang defaults", () => {
  const cyclic: Record<string, unknown> = { name: "n" };
  cyclic.self = cyclic;
  const value = defaults([] as { name?: string }[], cyclic as never);
  // The cycle is preserved inside the clone (self points at the clone).
  const clone = (value as typeof cyclic).self as unknown as Record<
    string,
    unknown
  >;
  expect(clone).not.toBe(cyclic);
  expect(clone.self).toBe(clone);
});

test("equal rejects prototype and type mismatches with no enumerable keys", () => {
  expect(equal(new Map(), new Set())).toBe(false);
  expect(equal(/a/, {})).toBe(false);
  expect(equal(new Date(), {})).toBe(false);
  expect(equal(new Map([["a", 1]]), new Map([["a", 1]]))).toBe(true);
  expect(equal(/a/g, /a/g)).toBe(true);
  expect(equal(/a/g, /a/i)).toBe(false);
});

test("form-level tip classNames and styles apply to the tip marker", () => {
  const { container } = render(
    <AutoForm
      classNames={{ tip: "custom-tip" }}
      styles={{ tip: { color: "red" } }}
      fields={[{ name: "n", label: "N", tip: "helpful" }]}
    />,
  );
  const marker = container.querySelector(".auto-tip-marker")!;
  expect(marker).toHaveClass("custom-tip");
  expect(marker).toHaveStyle({ color: "rgb(255, 0, 0)" });
});
