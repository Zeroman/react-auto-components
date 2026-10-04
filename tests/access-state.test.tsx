import { act, render, screen, waitFor } from "@testing-library/react";
import { memo } from "react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import {
  createAutoAccess,
  AutoConfigProvider,
  useAutoConfig,
  AutoForm,
  AutoTabs,
  AutoDialogProvider,
  useAutoDialog,
  AutoNavigationProvider,
  createAutoNavigation,
} from "../src/index";

test("access state checks explicit permissions, roles, user and organizations", () => {
  const access = createAutoAccess({
    userId: "alice",
    roles: ["editor"],
    permissions: ["project:read", "project:edit"],
    orgIds: ["north"],
  });
  expect(access.hasPerm("project:read")).toBe(true);
  expect(access.hasPerm("project:delete")).toBe(false);
  expect(access.hasRole("editor")).toBe(true);
  expect(access.hasRole("admin")).toBe(false);
  expect(access.hasUser("alice")).toBe(true);
  expect(access.hasUser("bob")).toBe(false);
  expect(access.hasOrg("north")).toBe(true);
  expect(access.hasOrg("south")).toBe(false);
  expect(
    access.canAccess({ roles: ["editor"], permissions: ["project:edit"] }),
  ).toBe(true);
  expect(access.canAccess({ roles: ["editor", "admin"] })).toBe(false);
  expect(
    access.canAccess({ permissions: ["project:read", "project:delete"] }),
  ).toBe(false);
  expect(access.canAccess({})).toBe(true);
});

test("patches retain unrelated grants while identity replacement and reset clear old grants", () => {
  const access = createAutoAccess({
    userId: "alice",
    roles: ["admin"],
    permissions: ["edit"],
    orgIds: ["north"],
  });
  access.setState({ permissions: [] });
  expect(access.hasRole("admin")).toBe(true);
  expect(access.hasPerm("edit")).toBe(false);
  expect(access.hasUser("alice")).toBe(true);
  access.replaceState({ userId: "bob", roles: ["reader"] });
  expect(access.getState()).toEqual({
    userId: "bob",
    roles: ["reader"],
    permissions: [],
    orgIds: [],
  });
  access.reset();
  expect(access.getState()).toEqual({
    userId: null,
    roles: [],
    permissions: [],
    orgIds: [],
  });
});

test("snapshots cannot be changed through input aliases and subscriptions detach", () => {
  const permissions = ["read"];
  const access = createAutoAccess({ permissions });
  const initial = access.getState();
  permissions.push("write");
  expect(access.hasPerm("write")).toBe(false);
  const seen: string[][] = [];
  const detach = access.subscribe(() =>
    seen.push([...access.getState().permissions]),
  );
  access.setState({ permissions: ["read"] });
  expect(access.getState()).toBe(initial);
  access.setState({ permissions: ["write"] });
  expect(seen).toEqual([["write"]]);
  expect(initial.permissions).toEqual(["read"]);
  expect(Object.isFrozen(access.getState().permissions)).toBe(true);
  detach();
  access.reset();
  expect(seen).toEqual([["write"]]);
});

test("separate app instances do not share access state", () => {
  const one = createAutoAccess();
  const two = createAutoAccess();
  one.setState({ permissions: ["edit"] });
  expect(two.hasPerm("edit")).toBe(false);
  expect(one.hasPerm("edit")).toBe(true);
});

test("external store changes refresh memoized fields and caller-owned checks through nested providers", () => {
  const access = createAutoAccess();
  const Fields = memo(function Fields() {
    const { access: current } = useAutoConfig();
    return (
      <>
        <output data-testid="user-gate">
          {String(current?.hasUser("alice"))}
        </output>
        <output data-testid="org-gate">
          {String(current?.hasOrg("north"))}
        </output>
        <AutoForm
          fields={[
            { name: "public", label: "Public" },
            { name: "secret", label: "Secret", permissions: ["read"] },
            { name: "admin", label: "Admin", roles: ["admin"] },
          ]}
          actions={false}
        />
      </>
    );
  });
  render(
    <AutoConfigProvider config={{ access }}>
      <AutoConfigProvider config={{ size: "small" }}>
        <Fields />
      </AutoConfigProvider>
    </AutoConfigProvider>,
  );
  expect(screen.queryByRole("textbox", { name: "Secret" })).toBeNull();
  act(() =>
    access.setState({
      userId: "alice",
      orgIds: ["north"],
      permissions: ["read"],
      roles: ["admin"],
    }),
  );
  expect(screen.getByRole("textbox", { name: "Secret" })).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Admin" })).toBeVisible();
  expect(screen.getByTestId("user-gate")).toHaveTextContent("true");
  expect(screen.getByTestId("org-gate")).toHaveTextContent("true");
  act(() => access.reset());
  expect(screen.queryByRole("textbox", { name: "Secret" })).toBeNull();
  expect(screen.queryByRole("textbox", { name: "Admin" })).toBeNull();
  expect(screen.getByRole("textbox", { name: "Public" })).toBeVisible();
  expect(screen.getByTestId("user-gate")).toHaveTextContent("false");
});

test("custom canAccess remains authoritative and is reevaluated after access updates", () => {
  const access = createAutoAccess();
  render(
    <AutoConfigProvider
      config={{
        access,
        canAccess: () => access.hasUser("alice") && access.hasOrg("north"),
      }}
    >
      <AutoForm fields={[{ name: "name", label: "Private" }]} actions={false} />
    </AutoConfigProvider>,
  );
  expect(screen.queryByRole("textbox")).toBeNull();
  act(() => access.setState({ userId: "alice", orgIds: ["north"] }));
  expect(screen.getByRole("textbox", { name: "Private" })).toBeVisible();
  act(() => access.setState({ orgIds: [] }));
  expect(screen.queryByRole("textbox")).toBeNull();
});

test("a nested access store replaces inherited built-in checks and can be rebound", () => {
  const parent = createAutoAccess();
  const first = createAutoAccess({ permissions: ["read"] });
  const second = createAutoAccess();
  const app = (access: typeof first) => (
    <AutoConfigProvider config={{ access: parent }}>
      <AutoConfigProvider config={{ access }}>
        <AutoForm
          fields={[{ name: "name", label: "Private", permissions: ["read"] }]}
          actions={false}
        />
      </AutoConfigProvider>
    </AutoConfigProvider>
  );
  const view = render(app(first));
  expect(screen.getByRole("textbox")).toBeVisible();
  view.rerender(app(second));
  expect(screen.queryByRole("textbox")).toBeNull();
  act(() => first.setState({ permissions: [] }));
  expect(screen.queryByRole("textbox")).toBeNull();
  act(() => second.setState({ permissions: ["read"] }));
  expect(screen.getByRole("textbox")).toBeVisible();
});

test("permission revocation reconciles active routes and prevents direct navigation", async () => {
  const access = createAutoAccess({ permissions: ["audit:read"] });
  const nav = createAutoNavigation({ initialPath: "workspace:home" });
  const view = render(
    <AutoConfigProvider config={{ access }}>
      <AutoNavigationProvider navigation={nav}>
        <AutoTabs
          route={{ name: "workspace", defaultChild: "home" }}
          items={[
            { id: "home", label: "Home", content: "Home content" },
            {
              id: "audit",
              label: "Audit",
              permissions: ["audit:read"],
              content: "Audit content",
            },
          ]}
        />
      </AutoNavigationProvider>
    </AutoConfigProvider>,
  );
  try {
    await act(async () => {
      expect((await nav.goto("workspace:audit")).status).toBe("success");
    });
    const signal = nav.getSignal();
    expect(screen.getByText("Audit content")).toBeVisible();
    act(() => access.setState({ permissions: [] }));
    await waitFor(() => expect(nav.pathString).toBe("workspace:home"));
    expect(signal.aborted).toBe(true);
    expect(screen.queryByRole("tab", { name: "Audit" })).toBeNull();
    await act(async () => {
      expect((await nav.goto("workspace:audit")).status).toBe("forbidden");
    });
  } finally {
    view.unmount();
    nav.destroy();
  }
});

test("changing user through a patch cannot retain the previous user's grants", () => {
  const access = createAutoAccess({
    userId: "alice",
    roles: ["admin"],
    permissions: ["edit"],
    orgIds: ["north"],
  });
  access.setState({ userId: "bob" });
  expect(access.getState()).toEqual({
    userId: "bob",
    roles: [],
    permissions: [],
    orgIds: [],
  });
});

test("switching users closes private UI and keeps persisted drafts separated in one browser", async () => {
  const user = userEvent.setup();
  const access = createAutoAccess({ userId: "alice" });
  function Editor() {
    const dialog = useAutoDialog();
    return (
      <button
        onClick={() =>
          dialog.open({
            title: "Draft",
            draftKey: "note",
            fields: [{ name: "text", label: "Text" }],
          })
        }
      >
        Open draft
      </button>
    );
  }
  render(
    <AutoConfigProvider config={{ access, namespace: "switch-test" }}>
      <AutoDialogProvider>
        <Editor />
      </AutoDialogProvider>
    </AutoConfigProvider>,
  );
  await user.click(screen.getByText("Open draft"));
  await user.type(
    screen.getByRole("textbox", { name: "Text" }),
    "Alice private draft",
  );
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  await user.click(screen.getByText("Open draft"));
  act(() => access.replaceState({ userId: "bob" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  await user.click(screen.getByText("Open draft"));
  expect(screen.getByRole("textbox", { name: "Text" })).toHaveValue("");
  await user.type(
    screen.getByRole("textbox", { name: "Text" }),
    "Bob private draft",
  );
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  act(() => access.replaceState({ userId: "alice" }));
  await user.click(screen.getByText("Open draft"));
  expect(screen.getByRole("textbox", { name: "Text" })).toHaveValue(
    "Alice private draft",
  );
});

test("grant changes preserve current edits while identity changes reset them", async () => {
  const user = userEvent.setup();
  const access = createAutoAccess({ userId: "alice" });
  render(
    <AutoConfigProvider config={{ access }}>
      <AutoConfigProvider config={{ namespace: "nested" }}>
        <AutoForm fields={[{ name: "name", label: "Name" }]} actions={false} />
      </AutoConfigProvider>
    </AutoConfigProvider>,
  );
  await user.type(screen.getByRole("textbox"), "Alice unsaved");
  act(() => access.setState({ permissions: ["read"] }));
  expect(screen.getByRole("textbox")).toHaveValue("Alice unsaved");
  act(() => access.replaceState({ userId: "bob" }));
  expect(screen.getByRole("textbox")).toHaveValue("");
});
