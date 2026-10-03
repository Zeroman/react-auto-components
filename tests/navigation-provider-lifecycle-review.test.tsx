import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import { expect, test } from "vitest";
import {
  AutoNavigationProvider,
  AutoConfigProvider,
  AutoRouteScope,
  createAutoNavigation,
  useAutoNavigation,
  useAutoRoute,
} from "../src/index";
import type { AutoNavigation } from "../src/core/navigation/types";

test("owned provider remains live through StrictMode replay and destroys navigation on final unmount", async () => {
  let navigation: AutoNavigation | undefined;
  function Content() {
    navigation = useAutoNavigation();
    useAutoRoute({ children: ["home", "details"] });
    return null;
  }
  const view = render(
    <StrictMode>
      <AutoNavigationProvider initialPath="home">
        <Content />
      </AutoNavigationProvider>
    </StrictMode>,
  );
  await act(async () => {
    expect((await navigation!.goto("details")).status).toBe("success");
  });
  expect(navigation!.getSignal().aborted).toBe(false);
  view.unmount();
  await act(async () => {
    await new Promise<void>((resolve) => queueMicrotask(resolve));
  });
  expect(navigation!.getSignal().aborted).toBe(true);
});

test("an explicitly empty route configuration declares a scoped container", async () => {
  const navigation = createAutoNavigation();
  function Container() {
    useAutoRoute({});
    return null;
  }
  render(
    <AutoNavigationProvider navigation={navigation}>
      <AutoRouteScope path={["workspace"]}>
        <Container />
      </AutoRouteScope>
    </AutoNavigationProvider>,
  );
  await act(async () => {
    expect((await navigation.goto("workspace", { timeoutMs: 10 })).status).toBe(
      "success",
    );
  });
});

test("owned provider uses the current permission checker when access broadens", async () => {
  let navigation: AutoNavigation | undefined;
  function Content() {
    navigation = useAutoNavigation();
    useAutoRoute({ children: ["home", { id: "admin", roles: ["admin"] }] });
    return null;
  }
  const app = (allowed: boolean) => (
    <AutoConfigProvider
      config={{ canAccess: (access) => allowed || !access.roles?.length }}
    >
      <AutoNavigationProvider initialPath="home">
        <Content />
      </AutoNavigationProvider>
    </AutoConfigProvider>
  );
  const view = render(app(false));
  await act(async () => {
    expect((await navigation!.goto("admin")).status).toBe("forbidden");
  });
  view.rerender(app(true));
  await act(async () => {
    expect((await navigation!.goto("admin")).status).toBe("success");
  });
});
