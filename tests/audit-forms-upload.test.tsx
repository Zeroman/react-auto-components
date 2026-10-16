import { useState } from "react";
import { test, expect, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoForm, type AutoFormHandle } from "../src/components/AutoForm";
import { createRef } from "react";

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

test("unrelated controlled value change does not abort an in-flight upload", async () => {
  const gate = deferred<void>();
  const upload = vi.fn((_files: File[], signal: AbortSignal) => gate.promise);
  let external!: (v: { file: File | null; name: string }) => void;
  function Harness() {
    const [value, setValue] = useState<{ file: File | null; name: string }>({
      file: null,
      name: "",
    });
    external = setValue;
    return (
      <AutoForm
        fields={[
          { name: "file", label: "File", type: "upload", upload },
          { name: "name", label: "Name" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  }
  render(<Harness />);
  const input = screen.getByLabelText("File") as HTMLInputElement;
  await act(async () => {
    Object.defineProperty(input, "files", {
      value: [new File(["x"], "a.txt")],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(screen.getByRole("status")).toHaveTextContent("Uploading");
  // Parent updates a different field while the upload is in flight.
  act(() => external({ file: null, name: "unrelated" }));
  await act(async () => {
    gate.resolve();
  });
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  expect(upload.mock.calls[0][1].aborted).toBe(false);
});

test("explicit reset aborts an in-flight upload", async () => {
  const gate = deferred<void>();
  const upload = vi.fn((_files: File[], signal: AbortSignal) => {
    signal.addEventListener("abort", () => gate.resolve());
    return gate.promise;
  });
  const ref = createRef<AutoFormHandle<{ file: File[] | null }>>();
  render(
    <AutoForm<{ file: File[] | null }>
      ref={ref}
      fields={[
        { name: "file", label: "File", type: "upload", multiple: true, upload },
      ]}
    />,
  );
  const input = screen.getByLabelText("File") as HTMLInputElement;
  await act(async () => {
    Object.defineProperty(input, "files", {
      value: [new File(["x"], "a.txt")],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(screen.getByRole("status")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Reset" }));
  await waitFor(() => expect(upload.mock.calls[0][1].aborted).toBe(true));
});

test("external replacement of the upload field's own value aborts and syncs", async () => {
  const gate = deferred<void>();
  const upload = vi.fn((_files: File[], signal: AbortSignal) => gate.promise);
  let external!: (v: { file: File | null }) => void;
  function Harness() {
    const [value, setValue] = useState<{ file: File | null }>({ file: null });
    external = setValue;
    return (
      <AutoForm
        ref={ref}
        fields={[{ name: "file", label: "File", type: "upload", upload }]}
        value={value}
        onChange={setValue}
      />
    );
  }
  const ref = createRef<AutoFormHandle<{ file: File | null }>>();
  render(<Harness />);
  const input = screen.getByLabelText("File") as HTMLInputElement;
  await act(async () => {
    Object.defineProperty(input, "files", {
      value: [new File(["x"], "old.txt")],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(screen.getByRole("status")).toBeInTheDocument();
  // Parent replaces the uploaded file outright.
  const replacement = new File(["y"], "replacement.txt");
  await act(async () => {
    external({ file: replacement });
  });
  await waitFor(() => expect(upload.mock.calls[0][1].aborted).toBe(true));
  expect(ref.current!.getValues().file).toBe(replacement);
});
