import { afterEach, describe, expect, test } from "vitest";
// Review round: boundary regressions beyond the first audit fix.
// Source imports like devtools.test.ts; logs in review-red/review-green.
import { PageRegistry } from "../packages/devtools/src/registry";
import { createPageDriver } from "../packages/devtools/src/page";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// jsdom layout stub (same rationale as audit-devtools.test.ts).
const originalRects = Element.prototype.getClientRects;
const laidOut = (el: Element) => {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (node.hasAttribute("hidden")) return false;
    if (node instanceof HTMLElement && node.style.display === "none")
      return false;
  }
  return true;
};
import { beforeEach } from "vitest";
beforeEach(() => {
  const stub = function (this: Element) {
    return laidOut(this) ? [{ width: 8, height: 8 }] : [];
  } as unknown as typeof Element.prototype.getClientRects;
  Element.prototype.getClientRects = stub;
});
afterEach(() => {
  Element.prototype.getClientRects = originalRects;
  document.body.innerHTML = "";
});

describe("exact poll waiter cancellation", () => {
  test("an old response closing after a newer poll parks leaves the newest waiter intact", async () => {
    const registry = new PageRegistry();
    const page = registry.connect({
      pageId: "p1",
      title: "A",
      url: "http://a",
    });

    const oldPoll = registry.beginPoll("p1", page.connectionId);
    // The client retries: the old waiter is replaced by a newer parked poll.
    const newPoll = registry.beginPoll("p1", page.connectionId);
    await expect(oldPoll.promise).resolves.toBeNull();

    // The OLD response's close arrives after the newer poll parked.
    oldPoll.cancel();
    let newWoken: unknown = "parked";
    newPoll.promise.then((value) => {
      newWoken = value;
    });
    await sleep(20);
    expect(newWoken).toBe("parked");

    // The newest waiter is still the delivery target, exactly once.
    const pending = registry.command("p1", "click", { ref: "r1" });
    const delivered = await newPoll.promise;
    expect(delivered?.cmd).toBe("click");
    // A late close of either stale response must not conjure a second
    // delivery or drop the queued command.
    oldPoll.cancel();
    await registry.result("p1", page.connectionId, {
      id: delivered!.id,
      ok: true,
      data: "done",
    });
    await expect(pending).resolves.toBe("done");
    expect(registry.list()[0].status).toBe("ready");
  });

  test("cancel is inert after its own waiter already resolved", async () => {
    // Short staleMs keeps the idle long-poll deadline brief.
    const registry = new PageRegistry({ timeoutMs: 1000, staleMs: 500 });
    const page = registry.connect({
      pageId: "p1",
      title: "A",
      url: "http://a",
    });
    const first = registry.beginPoll("p1", page.connectionId);
    first.cancel();
    await expect(first.promise).resolves.toBeNull();
    // Cancellation after resolution must not disturb later waiters.
    const second = registry.beginPoll("p1", page.connectionId);
    let woken: unknown = "parked";
    second.promise.then((v) => {
      woken = v;
    });
    first.cancel();
    await sleep(20);
    expect(woken).toBe("parked");
    const delivered = await second.promise;
    expect(delivered).toBeNull();
  });
});

describe("component ownership and fields", () => {
  const inspect = async (markup: string) => {
    document.body.innerHTML = markup;
    const driver = createPageDriver(false);
    return (await driver.execute("inspect")) as {
      elements: Record<string, unknown>[];
      components: { type: string; name: string; fields: string[] }[];
    };
  };

  test("nested real components survive and fields follow the nearest owner", async () => {
    const snapshot = await inspect(`
      <div class="auto-tabs" aria-label="Tabs">
        <div class="auto-table" aria-label="Table">
          <button aria-label="TableBtn">t</button>
          <div class="auto-search" aria-label="Search">
            <form class="auto-form"><input name="q" aria-label="Query"></form>
          </div>
        </div>
        <form class="auto-form" aria-label="RealForm">
          <input name="b" aria-label="Field B">
        </form>
      </div>`);
    const types = snapshot.components.map((c) => c.type).sort();
    // Ghost AutoSearch-internal form suppressed; every real group kept.
    expect(types).toEqual(["AutoForm", "AutoSearch", "AutoTable", "AutoTabs"]);

    const componentOfField = (label: string) => {
      const el = snapshot.elements.find((e) => e.name === label);
      expect(el, label).toBeTruthy();
      const owner = snapshot.components.find((c) =>
        c.fields.includes(el!.ref as string),
      );
      return owner?.type;
    };
    expect(componentOfField("Query")).toBe("AutoSearch");
    expect(componentOfField("TableBtn")).toBe("AutoTable");
    expect(componentOfField("Field B")).toBe("AutoForm");

    // Fields partition: each field ref listed by exactly one component.
    const allRefs = snapshot.components.flatMap((c) => c.fields);
    expect(new Set(allRefs).size).toBe(allRefs.length);
    // No ancestor hoists descendants' fields into itself.
    const tabs = snapshot.components.find((c) => c.type === "AutoTabs")!;
    expect(tabs.fields).toEqual([]);
  });
});

describe("input roles", () => {
  test("number, range and search inputs map to precise roles", async () => {
    document.body.innerHTML = `
      <input type="number" aria-label="N">
      <input type="range" aria-label="R">
      <input type="search" aria-label="S">
      <input type="tel" aria-label="P">`;
    const driver = createPageDriver(false);
    const snapshot = (await driver.execute("inspect")) as {
      elements: { name: string; role: string }[];
    };
    const roleOf = (label: string) =>
      snapshot.elements.find((e) => e.name === label)?.role;
    expect(roleOf("N")).toBe("spinbutton");
    expect(roleOf("R")).toBe("slider");
    expect(roleOf("S")).toBe("searchbox");
    expect(roleOf("P")).toBe("textbox");
  });
});
