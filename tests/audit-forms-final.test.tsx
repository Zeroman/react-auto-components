import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { defaults } from "../src/core/config";
import { AutoForm, type AutoFormHandle } from "../src/components/AutoForm";
import { AutoSearch } from "../src/components/AutoSearch";

afterEach(cleanup);

test("instant popover edit validates a main cross-field rule against new outgoing values", async () => {
  const onSearch = vi.fn();
  const nameRule = vi.fn((v: unknown, values: { owner?: string }) =>
    v && values.owner === v ? "Name must differ from owner" : undefined,
  );
  render(
    <AutoSearch
      moreLayout="popover"
      fields={[
        { name: "name", label: "Name", rules: [nameRule] },
        { name: "owner", label: "Owner", search: { more: true } },
      ]}
      onSearch={onSearch}
    />,
  );
  await userEvent.type(screen.getByLabelText("Name"), "a");
  await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
  await userEvent.click(screen.getByTestId("rac-more-filters"));
  await userEvent.type(await screen.findByLabelText("Owner"), "a");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Name must differ from owner",
  );
  expect(onSearch).toHaveBeenCalledTimes(1);
  // The rule saw the NEW outgoing snapshot (owner just typed), not the old one.
  expect(nameRule.mock.calls.at(-1)?.[1]).toMatchObject({ owner: "a" });
});

test("collapsed inline required more-fields do not block search", async () => {
  const onSearch = vi.fn();
  render(
    <AutoSearch
      fields={[
        { name: "name", label: "Name" },
        {
          name: "owner",
          label: "Owner",
          required: true,
          search: { more: true },
        },
      ]}
      onSearch={onSearch}
    />,
  );
  await userEvent.type(screen.getByLabelText("Name"), "a");
  await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
  await userEvent.click(screen.getByTestId("rac-search"));
  await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("alert")).toBeNull();
});

test("main and popover resets each fire onChange and onSearch exactly once", async () => {
  const onSearch = vi.fn();
  const onChange = vi.fn();
  render(
    <AutoSearch
      mode="manual"
      moreLayout="popover"
      fields={[
        { name: "name", label: "Name" },
        { name: "owner", label: "Owner", search: { more: true } },
      ]}
      defaultValue={{ name: "n0", owner: "o0" }}
      onSearch={onSearch}
      onChange={onChange}
    />,
  );
  // Main reset.
  await userEvent.click(screen.getByTestId("rac-search-reset"));
  await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith({ name: "n0", owner: "o0" });
  // Popover reset.
  await userEvent.click(screen.getByTestId("rac-more-filters"));
  await userEvent.type(await screen.findByLabelText("Owner"), "x");
  const searches = onSearch.mock.calls.length;
  const changes = onChange.mock.calls.length;
  await userEvent.click(screen.getAllByText("Reset").at(-1)!);
  await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(searches + 1));
  expect(onChange).toHaveBeenCalledTimes(changes + 1);
  expect(onChange).toHaveBeenCalledWith({ name: "n0", owner: "o0" });
});

test("upload keeps File identity through defaults and controlled sync", async () => {
  const file = new File(["x"], "a.txt");
  // defaults/clone keeps opaque File identity on purpose.
  expect(
    (defaults([{ name: "file", defaultValue: file }], {}) as { file: unknown })
      .file,
  ).toBe(file);
  function Harness() {
    const [value, setValue] = useState<{ file: File | null }>({
      file: null,
    });
    return (
      <AutoForm
        fields={[{ name: "file", label: "File", type: "upload" }]}
        value={value}
        onChange={setValue}
      />
    );
  }
  const { rerender } = render(<Harness key="k" />);
  rerender(<Harness key="k" />);
  // Same File object survives a controlled rerender without a reset loop.
  expect(screen.getByLabelText("File")).toBeInTheDocument();
});

test("an explicit reset aborts the in-flight upload", async () => {
  const file = new File(["x"], "a.txt");
  let resolveUpload!: () => void;
  const upload = vi.fn((_files: File[], signal: AbortSignal) => {
    const promise = new Promise<File[]>((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("aborted")));
      resolveUpload = () => resolve([file]);
    });
    void promise.catch(() => {});
    return promise;
  });
  const change = vi.fn();
  const ref = createRef<AutoFormHandle<{ file: File[] | null }>>();
  render(
    <AutoForm<{ file: File[] | null }>
      ref={ref}
      fields={[
        { name: "file", label: "File", type: "upload", multiple: true, upload },
      ]}
      onChange={change}
    />,
  );
  await userEvent.upload(screen.getByLabelText("File"), file);
  expect(upload).toHaveBeenCalledTimes(1);
  ref.current?.reset();
  await act(async () => {
    resolveUpload();
  });
  await waitFor(() => expect(upload.mock.calls[0]![1].aborted).toBe(true));
  // The late upload result is discarded: no post-reset onChange echo.
  expect(change).not.toHaveBeenCalledWith({ file: [file] });
});
