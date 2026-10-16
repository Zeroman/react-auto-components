import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { DemoRunner } from "../packages/devtools/dist/demos.js";
import { PageRegistry } from "../packages/devtools/dist/registry.js";
import type {
  DemoScenario,
  PageCommand,
} from "../packages/devtools/dist/protocol.js";

const FORM_URL = "http://127.0.0.1:4174/#/form:rac";
const disposers: (() => void)[] = [];
const step = (holdMs = 50): DemoScenario => ({
  route: "form:rac",
  steps: [
    {
      message: "demo.name",
      focus: "rac-form-preview",
      holdMs,
      action: { cmd: "fill", names: ["Project name"], value: "Nebula" },
    },
  ],
});
const snapshot = (count = 1, url = FORM_URL) => ({
  url,
  components: [],
  elements: Array.from({ length: count }, (_, i) => ({
    ref: `r${i}`,
    name: "Project name",
    actions: ["fill"],
    disabled: false,
  })),
});
function harness(scenario = step()) {
  const registry = new PageRegistry({ staleMs: 600000 });
  const demos = new DemoRunner(registry, { form: scenario });
  disposers.push(() => {
    demos.dispose();
    registry.dispose();
  });
  const page = registry.connect({ title: "Demo", url: FORM_URL });
  const status = () => demos.status(page.pageId, page.connectionId);
  const start = (ack = true) => {
    const state = demos.start(page.pageId, page.connectionId, "form");
    if (ack) status();
    return state;
  };
  // Read an already queued command without waiting indefinitely for one.
  const take = async (target = page) => {
    const waiter = registry.beginPoll(target.pageId, target.connectionId);
    await vi.advanceTimersByTimeAsync(0);
    waiter.cancel();
    return waiter.promise;
  };
  const answer = async (command: PageCommand, data: unknown) => {
    registry.result(page.pageId, page.connectionId, {
      id: command.id,
      ok: true,
      data,
    });
    await vi.advanceTimersByTimeAsync(0);
  };
  return { registry, demos, page, status, start, take, answer };
}
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  vi.useRealTimers();
});

test("idle status reports availability without commands", async () => {
  const h = harness();
  expect(h.status()).toEqual({
    available: ["form"],
    phase: "idle",
    step: 0,
    total: 0,
  });
  expect(await h.take()).toBeNull();
});

test("guidance precedes the action by over three seconds, then the result is held", async () => {
  const h = harness(step(3000));
  expect(h.start()).toMatchObject({
    phase: "running",
    step: 1,
    message: "demo.name",
  });
  await vi.advanceTimersByTimeAsync(3000);
  expect(await h.take()).toBeNull();
  h.status();
  await vi.advanceTimersByTimeAsync(500);
  const inspect = (await h.take())!;
  expect(inspect?.cmd).toBe("inspect");
  await h.answer(inspect, snapshot());
  const fill = (await h.take())!;
  expect(fill).toMatchObject({
    cmd: "fill",
    payload: { ref: "r0", value: "Nebula" },
  });
  await h.answer(fill, {});
  await vi.advanceTimersByTimeAsync(2999);
  expect(h.status().phase).toBe("running");
  await vi.advanceTimersByTimeAsync(1);
  expect(h.status().phase).toBe("complete");
  expect(await h.take()).toBeNull();
});

test("without the initial status acknowledgement no command is sent", async () => {
  const h = harness();
  h.start(false);
  await vi.advanceTimersByTimeAsync(3500);
  expect(h.status().phase).toBe("error");
  expect(await h.take()).toBeNull();
});

test("ambiguous controls and an unexpected inspected route never trigger fill", async () => {
  for (const data of [
    snapshot(2),
    snapshot(1, "http://127.0.0.1:4174/#/table:local"),
  ]) {
    const h = harness();
    h.start();
    await vi.advanceTimersByTimeAsync(3500);
    const inspect = (await h.take())!;
    expect(inspect?.cmd).toBe("inspect");
    await h.answer(inspect, data);
    expect(h.status().phase).toBe("error");
    expect(await h.take()).toBeNull();
  }
});

test("a reload fences the old run and stale identities cannot stop the replacement", async () => {
  const h = harness();
  h.start();
  const replacement = h.registry.connect({
    ...h.page,
    reload: true,
    title: "Reloaded",
    url: FORM_URL,
  });
  expect(replacement.connectionId).not.toBe(h.page.connectionId);
  expect(() => h.status()).toThrow(/no longer available/);
  expect(() => h.demos.stop(h.page.pageId, h.page.connectionId)).toThrow(
    /no longer available/,
  );
  await vi.advanceTimersByTimeAsync(3500);
  expect(await h.take(replacement)).toBeNull();
  expect(
    h.demos.status(replacement.pageId, replacement.connectionId).phase,
  ).toBe("idle");
  h.demos.start(replacement.pageId, replacement.connectionId, "form");
  expect(() => h.demos.stop(h.page.pageId, h.page.connectionId)).toThrow();
  expect(
    h.demos.status(replacement.pageId, replacement.connectionId).phase,
  ).toBe("running");
});

test("a run only sends commands to its selected page", async () => {
  const h = harness();
  const other = h.registry.connect({ title: "Other", url: FORM_URL });
  const wrongRoute = h.registry.connect({
    title: "Search",
    url: "http://127.0.0.1:4174/#/search:rac",
  });
  expect(() =>
    h.demos.start(wrongRoute.pageId, wrongRoute.connectionId, "form"),
  ).toThrow(/matching page/);
  h.start();
  await vi.advanceTimersByTimeAsync(3500);
  expect(await h.take(other)).toBeNull();
  expect((await h.take())?.cmd).toBe("inspect");
  expect(h.demos.status(other.pageId, other.connectionId).phase).toBe("idle");
});

test("stop while inspect is pending prevents fill when that result arrives", async () => {
  const h = harness();
  h.start();
  await vi.advanceTimersByTimeAsync(3500);
  const inspect = (await h.take())!;
  expect(inspect?.cmd).toBe("inspect");
  expect(h.demos.stop(h.page.pageId, h.page.connectionId).phase).toBe(
    "stopping",
  );
  await h.answer(inspect, snapshot());
  expect(h.status().phase).toBe("stopped");
  await vi.advanceTimersByTimeAsync(10000);
  expect(await h.take()).toBeNull();
});

test("stop during the guidance delay emits no action", async () => {
  const h = harness();
  h.start();
  await vi.advanceTimersByTimeAsync(200);
  h.demos.stop(h.page.pageId, h.page.connectionId);
  await vi.advanceTimersByTimeAsync(10000);
  expect(h.status().phase).toBe("stopped");
  expect(await h.take()).toBeNull();
});

test("heartbeat loss prevents the next action", async () => {
  const scenario = step();
  scenario.steps.unshift({ message: "read", focus: "preview", holdMs: 3000 });
  const h = harness(scenario);
  h.start();
  await vi.advanceTimersByTimeAsync(3500);
  expect(await h.take()).toBeNull();
  await vi.advanceTimersByTimeAsync(3000);
  expect(h.status().phase).toBe("error");
  await vi.advanceTimersByTimeAsync(10000);
  expect(await h.take()).toBeNull();
});
