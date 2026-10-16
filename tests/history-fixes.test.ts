import { afterEach, expect, test, vi } from "vitest";
import {
  createBrowserHistory,
  createHashHistory,
  decodeLocation,
  encodeLocation,
} from "../src/index";

afterEach(() => {
  window.history.replaceState(null, "", "/");
  window.location.hash = "";
});

// ---------- Fix 3: subscriber exceptions are isolated ----------

test("browser history: a throwing subscriber does not block later listeners or later events", () => {
  const history = createBrowserHistory();
  window.history.replaceState(null, "", "/start");
  const seen: string[] = [];
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const unsubs = [
    history.subscribe(() => {
      throw new Error("boom");
    }),
    history.subscribe((loc) => seen.push(loc.path.join("/"))),
  ];
  try {
    window.history.pushState(null, "", "/first");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(seen).toEqual(["first"]);
    // A later event must still reach surviving subscribers.
    window.history.pushState(null, "", "/second");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(seen).toEqual(["first", "second"]);
    // Unsubscribing during notification does not break the remaining listeners.
    let thirdCalls = 0;
    const unsubThird = history.subscribe(() => {
      thirdCalls++;
      unsubThird();
    });
    unsubs.push(unsubThird);
    window.history.pushState(null, "", "/third");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(thirdCalls).toBe(1);
    expect(seen).toEqual(["first", "second", "third"]);
  } finally {
    for (const unsub of unsubs) unsub();
    errorSpy.mockRestore();
  }
});

test("hash history: a throwing subscriber does not block later listeners", () => {
  const history = createHashHistory();
  window.location.hash = "#/start";
  const seen: string[] = [];
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const unsubs = [
    history.subscribe(() => {
      throw new Error("boom");
    }),
    history.subscribe((loc) => seen.push(loc.path.join("/"))),
  ];
  try {
    window.location.hash = "#/next";
    window.dispatchEvent(new Event("hashchange"));
    expect(seen).toEqual(["next"]);
  } finally {
    for (const unsub of unsubs) unsub();
    errorSpy.mockRestore();
  }
});

// ---------- Fix 4: basePath matches by segments, raw or percent-encoded ----------

test("encodeLocation -> decodeLocation roundtrips encoded segments", () => {
  const url = encodeLocation(
    { path: ["a/b", "c"], params: { q: "1" } },
    "",
    "/",
  );
  expect(url).toBe("a%2Fb/c?q=1");
  expect(decodeLocation(url)).toEqual({
    path: ["a/b", "c"],
    params: { q: "1" },
  });
});

test("decodeLocation matches a raw prefix against an encoded URL by segments", () => {
  expect(decodeLocation("/my%20app/x?q=1", "my app")).toEqual({
    path: ["x"],
    params: { q: "1" },
  });
  // Encoded prefix against a raw URL also matches (raw string equality).
  expect(decodeLocation("/my app/x", "my%20app")).toEqual({
    path: ["x"],
    params: {},
  });
});

test("decodeLocation keeps the admin/administrator boundary and exact base match", () => {
  expect(decodeLocation("/administrator/x", "admin")).toEqual({
    path: [],
    params: {},
  });
  expect(decodeLocation("/admin", "admin")).toEqual({ path: [], params: {} });
  expect(decodeLocation("/admin/x", "admin")).toEqual({
    path: ["x"],
    params: {},
  });
});

test("decodeLocation keeps encoded slash and colon inside a segment and survives malformed escapes", () => {
  expect(decodeLocation("/base/a%2Fb%3Ac", "base")).toEqual({
    path: ["a/b:c"],
    params: {},
  });
  expect(decodeLocation("/base/%ZZx", "base")).toEqual({
    path: ["%ZZx"],
    params: {},
  });
});

test("hash adapter resolves a basePath from raw and encoded URLs", () => {
  window.location.hash = "#/my%20app/x";
  const history = createHashHistory({ basePath: "my app" });
  expect(history.read()).toEqual({ path: ["x"], params: {} });
  window.location.hash = "#/my app/y";
  expect(history.read()).toEqual({ path: ["y"], params: {} });
});

test("browser adapter resolves a basePath from an encoded URL", () => {
  window.history.replaceState(null, "", "/my%20app/x?q=1");
  const history = createBrowserHistory({ basePath: "my app" });
  expect(history.read()).toEqual({ path: ["x"], params: { q: "1" } });
});
