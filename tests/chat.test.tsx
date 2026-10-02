import { createRef } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import {
  AutoChat,
  type AutoChatHandle,
  type AutoChatMessage,
} from "../src/components/AutoChat";
import { AutoConfigProvider } from "../src/core/AutoConfigProvider";

const messages: AutoChatMessage[] = [
  { id: "one", role: "assistant", content: "Hello" },
];
const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const editor = () => screen.getByRole("textbox", { name: "Message" });

describe("AutoChat", () => {
  test("delegates rich messages and actions with the original typed data", () => {
    const rich = [
      { id: "one", role: "tool" as const, content: "unused", result: 42 },
    ];
    const action = vi.fn();
    render(
      <AutoChat
        messages={rich}
        renderMessage={(message) => <output>{message.result}</output>}
        renderActions={(message) => (
          <button onClick={() => action(message.id)}>Inspect</button>
        )}
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.queryByText("unused")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Inspect"));
    expect(action).toHaveBeenCalledWith("one");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
  test("treats markup strings as text", () => {
    render(
      <AutoChat
        messages={[
          { id: "x", role: "user", content: '<img src=x onerror="alert(1)">' },
        ]}
      />,
    );
    expect(
      screen.getByText('<img src=x onerror="alert(1)">'),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  test("sends once, preserving whitespace, then clears accepted draft", async () => {
    const done = deferred();
    const onSend = vi.fn(() => done.promise);
    render(<AutoChat messages={messages} onSend={onSend} />);
    fireEvent.change(editor(), { target: { value: "  hello\nworld  " } });
    fireEvent.keyDown(editor(), { key: "Enter" });
    fireEvent.keyDown(editor(), { key: "Enter" });
    expect(onSend).toHaveBeenCalledExactlyOnceWith("  hello\nworld  ");
    await act(async () => done.resolve());
    expect(editor()).toHaveValue("");
  });
  test("failed sends retain the draft and surface a safe translated error", async () => {
    const error = new Error("private transport detail");
    const onError = vi.fn();
    render(
      <AutoChat
        messages={[]}
        onSend={() => Promise.reject(error)}
        onSendError={onError}
      />,
    );
    fireEvent.change(editor(), { target: { value: "retry me" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByRole("alert");
    expect(editor()).toHaveValue("retry me");
    expect(screen.queryByText(error.message)).not.toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(error);
  });
  test("does not erase a new draft typed while a send is pending", async () => {
    const done = deferred();
    render(
      <AutoChat
        messages={[]}
        onSend={() => done.promise}
        defaultValue="first"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.change(editor(), { target: { value: "next" } });
    await act(async () => done.resolve());
    expect(editor()).toHaveValue("next");
  });
  test("IME, Shift+Enter and disabled keyboard sending do not submit", () => {
    const onSend = vi.fn();
    const { rerender } = render(
      <AutoChat messages={[]} onSend={onSend} defaultValue="Hello" />,
    );
    fireEvent.compositionStart(editor());
    fireEvent.keyDown(editor(), { key: "Enter" });
    fireEvent.compositionEnd(editor());
    fireEvent.keyDown(editor(), { key: "Enter", isComposing: true });
    fireEvent.keyDown(editor(), { key: "Enter", keyCode: 229 });
    fireEvent.keyDown(editor(), { key: "Enter", shiftKey: true });
    rerender(<AutoChat messages={[]} onSend={onSend} sendOnEnter={false} />);
    fireEvent.keyDown(editor(), { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });
  test("controlled drafts notify the host without changing the supplied value", async () => {
    const onValueChange = vi.fn();
    render(
      <AutoChat
        messages={[]}
        value="controlled"
        onValueChange={onValueChange}
        onSend={() => {}}
      />,
    );
    fireEvent.change(editor(), { target: { value: "edited" } });
    expect(onValueChange).toHaveBeenCalledWith("edited");
    expect(editor()).toHaveValue("controlled");
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(""));
    expect(editor()).toHaveValue("controlled");
  });
  test("stops generation and blocks new submissions while generating", () => {
    const onSend = vi.fn();
    const onStop = vi.fn();
    render(
      <AutoChat
        messages={messages}
        onSend={onSend}
        onStop={onStop}
        generating
        defaultValue="later"
      />,
    );
    fireEvent.keyDown(editor(), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onSend).not.toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledOnce();
  });
  test("switching conversations isolates pending completion and local draft", async () => {
    const done = deferred();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <AutoChat
        conversationKey="a"
        messages={[]}
        onSend={() => done.promise}
        onValueChange={onValueChange}
        defaultValue="old"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    rerender(
      <AutoChat
        conversationKey="b"
        messages={[]}
        onSend={() => {}}
        onValueChange={onValueChange}
        defaultValue="new"
      />,
    );
    await act(async () => done.resolve());
    expect(editor()).toHaveValue("new");
    expect(onValueChange).not.toHaveBeenCalled();
  });
  test("older-history requests are deduplicated and failures allow retry", async () => {
    const done = deferred();
    const onLoadOlder = vi.fn(() => done.promise);
    const onLoadError = vi.fn();
    render(
      <AutoChat
        messages={messages}
        hasMore
        onLoadOlder={onLoadOlder}
        onLoadError={onLoadError}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Load earlier messages" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Loading…" }));
    expect(onLoadOlder).toHaveBeenCalledOnce();
    const failure = new Error("failed");
    await act(async () => done.reject(failure));
    expect(onLoadError).toHaveBeenCalledExactlyOnceWith(failure);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Earlier messages could not be loaded",
    );
    expect(
      screen.getByRole("button", { name: "Load earlier messages" }),
    ).toBeEnabled();
  });
  test("labels use provider translations and explicit overrides, with focus handle", () => {
    const ref = createRef<AutoChatHandle>();
    render(
      <AutoConfigProvider
        config={{
          t: (key, fallback) => (key === "chat.send" ? "Send" : fallback!),
        }}
      >
        <AutoChat
          ref={ref}
          messages={[]}
          onSend={() => {}}
          labels={{ composer: "Type a message" }}
        />
      </AutoConfigProvider>,
    );
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    act(() => ref.current?.focusComposer());
    expect(
      screen.getByRole("textbox", { name: "Type a message" }),
    ).toHaveFocus();
    expect(ref.current?.getScrollElement()).toBe(screen.getByRole("log"));
  });
  test("blank drafts and disabled composers do not send", () => {
    const onSend = vi.fn();
    const { rerender } = render(
      <AutoChat messages={[]} onSend={onSend} defaultValue={" \n "} />,
    );
    fireEvent.keyDown(editor(), { key: "Enter" });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    rerender(<AutoChat messages={[]} onSend={onSend} value="text" disabled />);
    fireEvent.keyDown(editor(), { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });
});
