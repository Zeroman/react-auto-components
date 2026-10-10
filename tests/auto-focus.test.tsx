import { StrictMode, createRef, useState } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AutoFocus, AutoTabs } from "../src";

const settle = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 40)));
const focused = (label: string) =>
  waitFor(() => expect(screen.getByLabelText(label)).toHaveFocus());

test("standalone AutoFocus enters the first usable control without stealing later manual focus", async () => {
  const u = userEvent.setup();
  const view = render(
    <AutoFocus>
      <input disabled aria-label="Disabled" />
      <input aria-label="Entry" />
      <input aria-label="Other" />
    </AutoFocus>,
  );
  await focused("Entry");
  await u.click(screen.getByLabelText("Other"));
  view.rerender(
    <AutoFocus>
      <input disabled aria-label="Disabled" />
      <input aria-label="Entry" />
      <input aria-label="Other" />
      <p>Updated</p>
    </AutoFocus>,
  );
  await settle();
  expect(screen.getByLabelText("Other")).toHaveFocus();
});

test("last registered visible target wins once per batch and earlier target resumes on hide or removal", async () => {
  const events: string[] = [];
  function Content({ hidden = false, present = true }) {
    return (
      <>
        <AutoFocus>
          <input aria-label="First" onFocus={() => events.push("first")} />
        </AutoFocus>
        {present && (
          <section hidden={hidden}>
            <AutoFocus>
              <input aria-label="Last" onFocus={() => events.push("last")} />
            </AutoFocus>
          </section>
        )}
      </>
    );
  }
  const view = render(<Content />);
  await focused("Last");
  expect(events).toEqual(["last"]);
  view.rerender(<Content hidden />);
  await focused("First");
  view.rerender(<Content />);
  await focused("Last");
  view.rerender(<Content present={false} />);
  await focused("First");
});

test("hidden, inert, disabled fieldset and closed details exclude candidates", async () => {
  const view = render(
    <>
      <AutoFocus>
        <input aria-label="Fallback" />
      </AutoFocus>
      <fieldset disabled>
        <AutoFocus>
          <input aria-label="Blocked" />
        </AutoFocus>
      </fieldset>
      <div inert>
        <AutoFocus>
          <input aria-label="Inert" />
        </AutoFocus>
      </div>
      <details>
        <AutoFocus>
          <input aria-label="Closed" />
        </AutoFocus>
      </details>
      <div style={{ display: "none" }}>
        <AutoFocus>
          <input aria-label="Hidden" />
        </AutoFocus>
      </div>
    </>,
  );
  await focused("Fallback");
  const fieldset = screen.getByLabelText("Blocked").closest("fieldset")!;
  fieldset.disabled = false;
  await focused("Blocked");
  view.unmount();
});

test("CSS-hidden ancestors can reveal cached targets without React updates", async () => {
  render(
    <>
      <style>{".concealed { display: none; }"}</style>
      <div className="concealed" data-testid="parent">
        <AutoFocus>
          <input aria-label="Cached" />
        </AutoFocus>
      </div>
    </>,
  );
  await settle();
  expect(screen.getByLabelText("Cached")).not.toHaveFocus();
  screen.getByTestId("parent").className = "";
  await focused("Cached");
});

test("selector and external ref targets work independently and observe target replacement", async () => {
  const target = createRef<HTMLTextAreaElement>();
  function Content({ external = false, version = 1 }) {
    return (
      <>
        <AutoFocus target="textarea">
          <button>Skip</button>
          <textarea aria-label="Selected" />
        </AutoFocus>
        <AutoFocus target={target} disabled={!external} />
        <textarea key={version} ref={target} aria-label="External" />
      </>
    );
  }
  const view = render(<Content />);
  await focused("Selected");
  view.rerender(<Content external />);
  await focused("External");
  const old = screen.getByLabelText("External");
  view.rerender(<Content external version={2} />);
  await focused("External");
  expect(screen.getByLabelText("External")).not.toBe(old);
});

test("late content is discovered and removed registrations cannot focus it later", async () => {
  const view = render(
    <AutoFocus>
      <div data-testid="late" />
    </AutoFocus>,
  );
  const input = document.createElement("input");
  input.setAttribute("aria-label", "Async");
  screen.getByTestId("late").append(input);
  await focused("Async");
  view.unmount();
  const outside = document.createElement("input");
  document.body.append(outside);
  outside.focus();
  await settle();
  expect(outside).toHaveFocus();
  outside.remove();
});

test("StrictMode retains registration order and ordinary updates do not reregister earlier entries", async () => {
  const view = render(
    <StrictMode>
      <AutoFocus>
        <input aria-label="Early" />
      </AutoFocus>
      <AutoFocus>
        <input aria-label="Late" />
      </AutoFocus>
    </StrictMode>,
  );
  await focused("Late");
  screen.getByLabelText("Early").focus();
  view.rerender(
    <StrictMode>
      <AutoFocus>
        <input aria-label="Early" />
        <span>Changed</span>
      </AutoFocus>
      <AutoFocus>
        <input aria-label="Late" />
      </AutoFocus>
    </StrictMode>,
  );
  await settle();
  expect(screen.getByLabelText("Early")).toHaveFocus();
});

test.each([false, true])(
  "cached and lazy nested tabs enter the default editor for every switch (lazy=%s)",
  async (lazy) => {
    const u = userEvent.setup();
    render(
      <AutoTabs
        lazy={lazy}
        items={[
          {
            id: "a",
            label: "Outer A",
            children: [
              {
                id: "inner",
                label: "Inner",
                content: (
                  <AutoFocus>
                    <input aria-label="Entry" />
                    <input aria-label="Other" />
                  </AutoFocus>
                ),
              },
            ],
          },
          {
            id: "b",
            label: "Outer B",
            content: (
              <AutoFocus>
                <input aria-label="B entry" />
              </AutoFocus>
            ),
          },
        ]}
      />,
    );
    await focused("Entry");
    await u.click(screen.getByLabelText("Other"));
    await u.click(screen.getByRole("tab", { name: "Outer B" }));
    await focused("B entry");
    screen.getByRole("tab", { name: "Outer B" }).focus();
    await u.keyboard("{ArrowLeft}");
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Outer A" })).toHaveFocus(),
    );
    expect(screen.getByRole("tab", { name: "Outer B" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await u.keyboard("{Enter}");
    await focused("Entry");
    expect(screen.getByLabelText("Other")).not.toHaveFocus();
  },
);

test("an external target does not participate while its AutoFocus declaration is hidden", async () => {
  const target = createRef<HTMLInputElement>();
  function Content({ hidden }: { hidden: boolean }) {
    return (
      <>
        <AutoFocus>
          <input aria-label="Visible entry" />
        </AutoFocus>
        <div hidden={hidden}>
          <AutoFocus target={target} />
        </div>
        <input ref={target} aria-label="External entry" />
      </>
    );
  }
  const view = render(<Content hidden />);
  await focused("Visible entry");
  view.rerender(<Content hidden={false} />);
  await focused("External entry");
});

test("default discovery skips negative tabindex containers but explicit targets may select them", async () => {
  const view = render(
    <AutoFocus>
      <div tabIndex={-1} data-testid="scroll">
        <input aria-label="Editing entry" />
      </div>
    </AutoFocus>,
  );
  await focused("Editing entry");
  view.rerender(
    <AutoFocus target="[data-testid='scroll']">
      <div tabIndex={-1} data-testid="scroll">
        <input aria-label="Editing entry" />
      </div>
    </AutoFocus>,
  );
  await waitFor(() => expect(screen.getByTestId("scroll")).toHaveFocus());
});

test("ordinary rerenders and unrelated mutations do not query or measure registered entries", async () => {
  const content = <input aria-label="Quiet entry" />;
  const view = render(<AutoFocus>{content}</AutoFocus>);
  await focused("Quiet entry");
  await settle();
  const scope = screen.getByLabelText("Quiet entry").parentElement!;
  const queries = vi.spyOn(scope, "querySelectorAll");
  const styles = vi.spyOn(window, "getComputedStyle");
  try {
    view.rerender(<AutoFocus>{content}</AutoFocus>);
    await settle();
    expect(queries).not.toHaveBeenCalled();
    expect(styles).not.toHaveBeenCalled();
    const unrelated = document.createElement("section");
    document.body.append(unrelated);
    unrelated.textContent = "Streaming update";
    unrelated.dataset.progress = "1";
    await settle();
    expect(queries).not.toHaveBeenCalled();
    expect(styles).not.toHaveBeenCalled();
    unrelated.remove();
  } finally {
    queries.mockRestore();
    styles.mockRestore();
  }
});

test("a relevant mutation queries once and preserves custom-attribute visibility detection", async () => {
  render(
    <>
      <style>{"[data-concealed='yes'] { display: none; }"}</style>
      <section data-testid="ancestor" data-concealed="yes">
        <AutoFocus>
          <input aria-label="Attribute entry" />
        </AutoFocus>
      </section>
      <AutoFocus>
        <input aria-label="Unaffected entry" />
      </AutoFocus>
    </>,
  );
  await focused("Unaffected entry");
  await settle();
  const scope = screen.getByLabelText("Attribute entry").parentElement!;
  const other = screen.getByLabelText("Unaffected entry").parentElement!;
  const queries = vi.spyOn(scope, "querySelectorAll");
  const unrelatedQueries = vi.spyOn(other, "querySelectorAll");
  try {
    screen.getByTestId("ancestor").dataset.concealed = "no";
    await settle();
    expect(queries).toHaveBeenCalledTimes(1);
    expect(unrelatedQueries).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Attribute entry")).toBeVisible();
  } finally {
    queries.mockRestore();
    unrelatedQueries.mockRestore();
  }
});

test("repointing a stable ref to an existing element refreshes without DOM mutations", async () => {
  const target = createRef<HTMLInputElement>();
  const controls = (
    <>
      <input aria-label="Ref A" />
      <input aria-label="Ref B" />
    </>
  );
  const view = render(
    <>
      <AutoFocus target={target} />
      {controls}
    </>,
  );
  target.current = screen.getByLabelText("Ref A");
  view.rerender(
    <>
      <AutoFocus target={target} />
      {controls}
    </>,
  );
  await focused("Ref A");
  target.current = screen.getByLabelText("Ref B");
  view.rerender(
    <>
      <AutoFocus target={target} />
      {controls}
    </>,
  );
  await focused("Ref B");
});

test("an external ref target unmounting independently releases its cached winner", async () => {
  const target = createRef<HTMLInputElement>();
  function Editor() {
    const [visible, setVisible] = useState(true);
    return (
      <>
        <button onClick={() => setVisible(false)}>
          Remove external editor
        </button>
        {visible && <input ref={target} aria-label="External editor" />}
      </>
    );
  }
  render(
    <>
      <AutoFocus>
        <input aria-label="Fallback editor" />
      </AutoFocus>
      <Editor />
      <AutoFocus target={target} />
    </>,
  );
  await focused("External editor");
  fireEvent.click(screen.getByText("Remove external editor"));
  expect(target.current).toBeNull();
  await focused("Fallback editor");
});
