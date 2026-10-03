import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoSearch } from "../src/components/AutoSearch";

afterEach(cleanup);

for (const trigger of ["input", "reset", "submit"] as const) {
  for (const failure of ["throw", "reject"] as const) {
    test(`${trigger} displays ${failure} failures and preserves the search draft`, async () => {
      const escaped: string[] = [];
      const capture = (event: ErrorEvent) => {
        escaped.push(event.message);
        event.preventDefault();
      };
      window.addEventListener("error", capture);
      const u = userEvent.setup();
      const onSearch = vi.fn(() => {
        if (failure === "throw") throw new Error("Search unavailable");
        const rejected = Promise.reject(new Error("Search unavailable"));
        // Keep the red run from producing an unrelated runner-level rejection.
        void rejected.catch(() => {});
        return rejected;
      });
      try {
        render(
          <AutoSearch
            mode={trigger === "input" ? "instant" : "manual"}
            fields={[{ name: "name", label: "Name" }]}
            defaultValue={{ name: "default" }}
            onSearch={onSearch}
          />,
        );
        fireEvent.change(screen.getByRole("textbox"), {
          target: { value: "draft" },
        });
        if (trigger === "reset") await u.click(screen.getByText("Reset"));
        if (trigger === "submit") await u.click(screen.getByText("Search"));
        expect(await screen.findByRole("alert")).toHaveTextContent(
          "Search unavailable",
        );
        expect(screen.getByRole("textbox")).toHaveValue(
          trigger === "reset" ? "default" : "draft",
        );
        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(escaped).toEqual([]);
      } finally {
        window.removeEventListener("error", capture);
      }
    });
  }
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  void promise.catch(() => {});
  return { promise, resolve, reject };
}

test("an earlier search rejection cannot overwrite the latest successful search", async () => {
  const old = deferred();
  const latest = deferred();
  const onSearch = vi.fn((_query, values: { name: string }) =>
    values.name === "old" ? old.promise : latest.promise,
  );
  render(
    <AutoSearch
      fields={[{ name: "name", label: "Name" }]}
      onSearch={onSearch}
    />,
  );
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "old" } });
  await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "new" } });
  await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(2));
  await act(async () => {
    latest.resolve();
    await latest.promise;
    old.reject(new Error("Old failure"));
  });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("textbox")).toHaveValue("new");
});

test("instant validation blocks invalid filters and reset clears errors and searches exactly once", async () => {
  const u = userEvent.setup();
  const onSearch = vi.fn();
  render(
    <AutoSearch
      fields={[
        { name: "scope", label: "Scope", required: true },
        {
          name: "name",
          label: "Name",
          rules: [(value) => (value === "bad" ? "Invalid filter" : undefined)],
        },
      ]}
      onSearch={onSearch}
    />,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
    target: { value: "bad" },
  });
  expect(await screen.findByText("Scope is required")).toBeVisible();
  expect(screen.getByText("Invalid filter")).toBeVisible();
  expect(onSearch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("textbox", { name: "Scope" }), {
    target: { value: "all" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
    target: { value: "good" },
  });
  await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
  expect(onSearch.mock.lastCall?.[1]).toEqual({ scope: "all", name: "good" });
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
    target: { value: "bad" },
  });
  expect(await screen.findByText("Invalid filter")).toBeVisible();
  await u.click(screen.getByText("Reset"));
  expect(onSearch).toHaveBeenCalledTimes(2);
  expect(onSearch.mock.lastCall?.[0]).toEqual({
    kind: "group",
    operator: "and",
    children: [],
  });
  expect(screen.queryByRole("alert")).toBeNull();
});

test("only the newest async validation may emit a query", async () => {
  const old = deferred<string | undefined>();
  const latest = deferred<string | undefined>();
  const onSearch = vi.fn();
  render(
    <AutoSearch
      fields={[
        {
          name: "name",
          label: "Name",
          rules: [(value) => (value === "old" ? old.promise : latest.promise)],
        },
      ]}
      onSearch={onSearch}
    />,
  );
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "old" } });
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "new" } });
  expect(onSearch).not.toHaveBeenCalled();
  await act(async () => {
    latest.resolve(undefined);
    await latest.promise;
  });
  await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
  expect(onSearch.mock.lastCall?.[1]).toEqual({ name: "new" });
  await act(async () => {
    old.resolve("Old invalid filter");
    await old.promise;
  });
  expect(onSearch).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("alert")).toBeNull();
});

test("reset invalidates a pending validation before sending defaults", async () => {
  const validation = deferred<string | undefined>();
  const onSearch = vi.fn();
  const u = userEvent.setup();
  render(
    <AutoSearch
      fields={[
        { name: "name", label: "Name", rules: [() => validation.promise] },
      ]}
      onSearch={onSearch}
    />,
  );
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "draft" } });
  await u.click(screen.getByText("Reset"));
  expect(onSearch).toHaveBeenCalledTimes(1);
  expect(onSearch.mock.lastCall?.[0]).toEqual({
    kind: "group",
    operator: "and",
    children: [],
  });
  await act(async () => {
    validation.resolve("Invalid draft");
    await validation.promise;
  });
  expect(onSearch).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("alert")).toBeNull();
});

test("external controlled values invalidate an outstanding search error", async () => {
  const pending = deferred();
  const onSearch = vi.fn(() => pending.promise);
  const fields = [{ name: "name", label: "Name" }] as const;
  let external!: (value: { name: string }) => void;
  function Controlled() {
    const [value, setValue] = useState({ name: "initial" });
    external = setValue;
    return (
      <AutoSearch
        fields={fields}
        value={value}
        onChange={setValue}
        onSearch={onSearch}
      />
    );
  }
  render(<Controlled />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "draft" } });
  await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
  act(() => external({ name: "external" }));
  await act(async () => {
    pending.reject(new Error("Stale failure"));
  });
  expect(screen.getByRole("textbox")).toHaveValue("external");
  expect(screen.queryByRole("alert")).toBeNull();
});
