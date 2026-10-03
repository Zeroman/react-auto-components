import { createAutoNavigation } from "../src/core/navigation/createAutoNavigation";
import { expect, test } from "vitest";
import {
  decodeLocation,
  encodeLocation,
  locationsEqual,
  createMemoryHistory,
  syncHistory,
} from "../src/core/navigation/history";

test("location codec preserves explicit empty values and delimiter-containing IDs", () => {
  const location = {
    path: ["workspace", "项目:a/b?c#d"],
    params: { empty: "", term: "中文 & text", id: "42" },
  };
  expect(decodeLocation(encodeLocation(location))).toEqual(location);
});

test("location equality ignores query ordering while preserving explicitly empty parameters", () => {
  expect(
    locationsEqual(
      { path: ["a"], params: { x: "1", y: "2" } },
      { path: ["a"], params: { y: "2", x: "1" } },
    ),
  ).toBe(true);
  expect(
    locationsEqual(
      { path: ["a"], params: { filter: "" } },
      { path: ["a"], params: {} },
    ),
  ).toBe(false);
});

function createTree() {
  const navigation = createAutoNavigation({ initialPath: "home" });
  navigation.registerNode({
    id: "root",
    ticketId: 1,
    parentPath: [],
    routePath: [],
    getChildren: () => [
      { id: "home" },
      { id: "slow" },
      { id: "fast" },
      { id: "denied", disabled: true },
    ],
  });
  return navigation;
}

function registerSlow(navigation: ReturnType<typeof createTree>) {
  navigation.registerNode({
    id: "slow",
    ticketId: 2,
    parentPath: [],
    routePath: ["slow"],
    getChildren: () => [{ id: "details" }],
  });
}

test("memory synchronization records only final lazy navigation commits", async () => {
  const navigation = createTree();
  const history = createMemoryHistory({ path: ["home"] });
  const detach = syncHistory(navigation, history);
  try {
    const pending = navigation.goto("slow:details");
    expect(history.read().path).toEqual(["home"]);
    expect(history.getEntries()).toHaveLength(1);
    registerSlow(navigation);
    expect((await pending).status).toBe("success");
    expect(history.read().path).toEqual(["slow", "details"]);
    expect(history.getEntries()).toHaveLength(2);
  } finally {
    detach();
    navigation.destroy();
  }
});

test("internal navigation during an unresolved history navigation still writes its URL", async () => {
  const navigation = createTree();
  const history = createMemoryHistory({ path: ["home"] });
  const detach = syncHistory(navigation, history);
  try {
    history.push({ path: ["slow", "details"] });
    expect((await navigation.goto("fast")).status).toBe("success");
    await Promise.resolve();
    expect(history.read().path).toEqual(["fast"]);
    expect(navigation.getPath()).toEqual(["fast"]);
  } finally {
    detach();
    navigation.destroy();
  }
});

test("an old rejected history input never writes a newer navigation's intermediate path", async () => {
  const navigation = createTree();
  const history = createMemoryHistory({ path: ["home"] });
  const detach = syncHistory(navigation, history);
  try {
    history.push({ path: ["denied"] });
    const pending = navigation.goto("slow:details");
    await Promise.resolve();
    expect(history.read().path).not.toEqual(["slow", "details"]);
    registerSlow(navigation);
    expect((await pending).status).toBe("success");
    expect(history.read().path).toEqual(["slow", "details"]);
  } finally {
    detach();
    navigation.destroy();
  }
});

test("a navigation target without any registered tree cannot report successful activation", async () => {
  const navigation = createAutoNavigation({ initialPath: "home" });
  try {
    const result = await navigation.goto("missing", { timeoutMs: 10 });
    expect(result.status).toBe("not-found");
    expect(navigation.getPath()).toEqual(["home"]);
  } finally {
    navigation.destroy();
  }
});

test("another navigation instance does not suppress rejection correction in this history bridge", async () => {
  const first = createTree();
  const second = createTree();
  const history = createMemoryHistory({ path: ["home"] });
  const detach = syncHistory(first, history);
  try {
    history.push({ path: ["denied"] });
    await second.goto("fast");
    await Promise.resolve();
    expect(history.read().path).toEqual(["home"]);
    expect(first.getPath()).toEqual(["home"]);
    expect(second.getPath()).toEqual(["fast"]);
  } finally {
    detach();
    first.destroy();
    second.destroy();
  }
});
