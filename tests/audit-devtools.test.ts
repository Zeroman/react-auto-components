import { afterAll, describe, expect, test } from "vitest";
// Audit regressions for the agent DevTools bridge. Source imports (like
// devtools.test.ts); HTTP-level cases live in audit-devtools-http.test.ts
// against the built dist.
import { PageRegistry } from "../packages/devtools/src/registry";
import { RacError } from "../packages/devtools/src/errors";
import { createPageDriver } from "../packages/devtools/src/page";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// jsdom performs no layout, so getClientRects is always empty and the
// driver's visible() filter would drop every element. Provide a minimal
// display-aware stand-in: an element is "laid out" unless it or an ancestor
// carries hidden or display:none. Restored after this file's tests.
const originalRects = Element.prototype.getClientRects;
const laidOut = (el: Element) => {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (node.hasAttribute("hidden")) return false;
    if (node instanceof HTMLElement && node.style.display === "none")
      return false;
  }
  return true;
};
Element.prototype.getClientRects = function (this: Element) {
  return (laidOut(this)
    ? [{ width: 8, height: 8 }]
    : []) as unknown as DOMRectList;
} as typeof Element.prototype.getClientRects;
afterAll(() => {
  Element.prototype.getClientRects = originalRects;
});

// ---------------------------------------------------------------------------
// 2.3 A canceled HTTP long poll must deregister ONLY the matching waiter,
// keep delivery/no-replay semantics and the page lease, and never take the
// page offline on a transient poll abort.
// ---------------------------------------------------------------------------
describe("poll cancellation", () => {
  test("cancelPoll parks out the matching waiter and the page stays ready", async () => {
    const registry = new PageRegistry();
    const page = registry.connect({
      pageId: "p1",
      title: "A",
      url: "http://a",
    });
    const poll = registry.beginPoll("p1", page.connectionId);
    poll.cancel();
    await expect(poll.promise).resolves.toBeNull();
    expect(registry.list()[0].status).toBe("ready");

    // A command issued while no poll is parked stays queued and is delivered
    // to the NEXT poll — never silently dropped into a closed response.
    const pending = registry.command("p1", "click", { ref: "r1" });
    const delivered = await registry.poll("p1", page.connectionId);
    expect(delivered?.cmd).toBe("click");
    await registry.result("p1", page.connectionId, {
      id: delivered!.id,
      ok: true,
      data: "done",
    });
    await expect(pending).resolves.toBe("done");
    expect(registry.list()[0].status).toBe("ready");
  });

  test("cancelling another page's waiter does not free this waiter", async () => {
    const registry = new PageRegistry();
    const page = registry.connect({
      pageId: "p1",
      title: "A",
      url: "http://a",
    });
    registry.connect({ pageId: "p2", title: "B", url: "http://b" });
    const mine = registry.beginPoll("p1", page.connectionId);
    let woken: { cmd: string } | null | undefined;
    mine.promise.then((value) => {
      woken = value;
    });
    const other = registry.beginPoll("p2", registry.list()[1].connectionId);
    other.cancel();
    other.cancel(); // inert after resolution
    await sleep(20);
    expect(woken).toBeUndefined();

    // The surviving waiter is still the delivery target.
    const pending = registry.command("p1", "dom", { ref: "r1" });
    const delivered = await mine.promise;
    expect(delivered?.cmd).toBe("dom");
    await registry.result("p1", page.connectionId, {
      id: delivered!.id,
      ok: true,
      data: "ok",
    });
    await expect(pending).resolves.toBe("ok");
  });
});

// ---------------------------------------------------------------------------
// 2.2 Page-side RacErrors must not be re-wrapped: the wire carries the raw
// problem detail, and the server builds exactly one formatted message.
// ---------------------------------------------------------------------------
describe("error wire format", () => {
  test("a failed result rejects once, with a single Fix/Code/Docs block", async () => {
    const registry = new PageRegistry();
    const page = registry.connect({
      pageId: "p1",
      title: "A",
      url: "http://a",
    });
    const pending = registry.command("p1", "fill", { ref: "r1" });
    const delivered = await registry.poll("p1", page.connectionId);
    await registry.result("p1", page.connectionId, {
      id: delivered!.id,
      ok: false,
      error: {
        code: "RAC-PAGE-ACTION",
        problem: "The field is read-only.",
        fix: "Choose an editable field from rac inspect.",
      },
    });
    let caught: unknown;
    try {
      await pending;
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RacError);
    const error = caught as RacError;
    expect(error.code).toBe("RAC-PAGE-ACTION");
    expect(error.message).toContain("The field is read-only.");
    expect(error.message.split("Fix:")).toHaveLength(2);
    expect(error.message.split("Code:")).toHaveLength(2);
    expect(error.message.split("Docs:")).toHaveLength(2);
    expect(error.message.split("The field is read-only.")).toHaveLength(2);
  });

  test("a page error without structured detail still falls back safely", async () => {
    const registry = new PageRegistry();
    const page = registry.connect({
      pageId: "p1",
      title: "A",
      url: "http://a",
    });
    const pending = registry.command("p1", "click", { ref: "r1" });
    const delivered = await registry.poll("p1", page.connectionId);
    await registry.result("p1", page.connectionId, {
      id: delivered!.id,
      ok: false,
      error: { code: "RAC-DEVTOOLS-COMMAND", message: "boom" },
    });
    await expect(pending).rejects.toMatchObject({
      code: "RAC-DEVTOOLS-COMMAND",
      message: expect.stringContaining("boom"),
    });
  });
});

// ---------------------------------------------------------------------------
// 2.4 Console serialization must keep Error message/stack, stay cycle-safe
// and bounded.
// ---------------------------------------------------------------------------
describe("console serialization", () => {
  test("Error instances keep their name, message and stack", async () => {
    const { formatConsoleValue } =
      await import("../packages/devtools/src/client");
    const text = formatConsoleValue(new Error("boom"));
    expect(text).toContain("boom");
    expect(text).toContain("Error");
    expect(text).not.toBe("{}");
    expect(text).not.toBe("[object Object]");
  });

  test("cyclic structures are serialized safely", async () => {
    const { formatConsoleValue } =
      await import("../packages/devtools/src/client");
    const cyclic: Record<string, unknown> = { name: "c" };
    cyclic.self = cyclic;
    expect(() => formatConsoleValue(cyclic)).not.toThrow();
    expect(formatConsoleValue(cyclic)).toContain("c");
  });

  test("output stays bounded", async () => {
    const { formatConsoleValue } =
      await import("../packages/devtools/src/client");
    expect(formatConsoleValue("x".repeat(10000)).length).toBeLessThanOrEqual(
      4200,
    );
  });

  test("oversized command results are replaced by a small structured error", async () => {
    const { limitResult } = await import("../packages/devtools/src/client");
    const small = { id: "c1", ok: true, data: 42 };
    expect(limitResult(small)).toEqual(small);
    const big = { id: "c2", ok: true, data: { blob: "x".repeat(2 ** 21) } };
    const limited = limitResult(big as unknown as typeof small);
    expect(limited.id).toBe("c2");
    expect(limited.ok).toBe(false);
    const error = (limited as { error?: { code?: string } }).error;
    expect(error?.code).toBe("RAC-DEVTOOLS-RESULT");
    expect(JSON.stringify(limited).length).toBeLessThan(64 * 1024);
  });
});

// ---------------------------------------------------------------------------
// 2.5 wait on an existing reference across hide/show (documented contract:
// wait follows a current ref; discovery of never-visible elements is out of
// scope, but refs survive hide/show).
// ---------------------------------------------------------------------------
describe("wait across hide/show", () => {
  test("a ref taken while visible still waits through hide then show", async () => {
    document.body.innerHTML = '<button data-testid="b">probe</button>';
    const driver = createPageDriver(false);
    const snapshot = (await driver.execute("inspect")) as {
      elements: { ref: string; testid?: string }[];
    };
    const ref = snapshot.elements.find((e) => e.testid === "b")!.ref;

    const button = document.querySelector("button")!;
    button.style.display = "none";
    const pending = driver.execute("wait", { ref, timeout: 2000 });
    setTimeout(() => {
      button.style.display = "";
    }, 100);
    await expect(pending).resolves.toEqual({ visible: true });
  });
});

// ---------------------------------------------------------------------------
// 2.6 Inspector fidelity: innermost component attribution, precise ARIA
// roles, fill actions that agree with the fill implementation, and
// truncation that counts visible interactive elements only.
// ---------------------------------------------------------------------------
describe("inspect fidelity", () => {
  const inspect = async (markup: string) => {
    document.body.innerHTML = markup;
    const driver = createPageDriver(false);
    return (await driver.execute("inspect")) as {
      elements: Record<string, unknown>[];
      components: { type: string; name: string; ref: string }[];
      truncated: boolean;
    };
  };

  test("a form nested in another component is not a ghost AutoForm", async () => {
    const snapshot = await inspect(`
      <div class="auto-search" aria-label="SearchComp">
        <form class="auto-form"><input name="q" aria-label="Query"></form>
      </div>`);
    expect(snapshot.components.map((c) => c.type)).toEqual(["AutoSearch"]);
    const field = snapshot.elements.find((e) => e.role === "textbox");
    expect(field?.component).toBe("SearchComp");
  });

  test("field attribution picks the innermost component", async () => {
    const snapshot = await inspect(`
      <div class="auto-tabs" aria-label="OuterTabs">
        <form class="auto-form" aria-label="InnerForm">
          <input name="a" aria-label="Field A">
        </form>
      </div>`);
    const field = snapshot.elements.find((e) => (e.field as string) === "a");
    expect(field?.component).toBe("InnerForm");
  });

  test("input types map to precise roles", async () => {
    const snapshot = await inspect(`
      <input type="radio" aria-label="R">
      <input type="checkbox" aria-label="C">
      <input type="button" aria-label="B" value="B">
      <input type="number" aria-label="N">
      <input type="text" aria-label="T">`);
    const roleOf = (label: string) =>
      snapshot.elements.find((e) => e.name === label)?.role;
    expect(roleOf("R")).toBe("radio");
    expect(roleOf("C")).toBe("checkbox");
    expect(roleOf("B")).toBe("button");
    expect(roleOf("N")).toBe("spinbutton");
    expect(roleOf("T")).toBe("textbox");
  });

  test("fill is advertised only where fill would succeed", async () => {
    const snapshot = await inspect(`
      <input type="text" aria-label="Editable">
      <input type="text" aria-label="Readonly" readonly>
      <input type="button" aria-label="Btn" value="go">
      <input type="submit" aria-label="Go" value="go">
      <input type="radio" aria-label="R">
      <textarea aria-label="Area"></textarea>
      <select aria-label="Sel"><option value="a">a</option></select>
      <button aria-label="Plain">x</button>`);
    const actionsOf = (label: string) =>
      (snapshot.elements.find((e) => e.name === label)?.actions ??
        []) as string[];
    expect(actionsOf("Editable")).toContain("fill");
    expect(actionsOf("R")).toContain("fill"); // checkbox/radio fill true|false
    expect(actionsOf("Area")).toContain("fill");
    expect(actionsOf("Sel")).toContain("fill");
    expect(actionsOf("Readonly")).not.toContain("fill");
    expect(actionsOf("Btn")).not.toContain("fill");
    expect(actionsOf("Go")).not.toContain("fill");
    expect(actionsOf("Plain")).not.toContain("fill");
  });

  test("truncated counts visible interactive elements only", async () => {
    const hiddenOverflow = Array.from(
      { length: 310 },
      (_, i) => `<button aria-label="h${i}">h</button>`,
    ).join("");
    const snapshotHidden = await inspect(
      `<div hidden>${hiddenOverflow}</div><button aria-label="one">x</button>`,
    );
    expect(snapshotHidden.truncated).toBe(false);

    const visibleOverflow = Array.from(
      { length: 310 },
      (_, i) => `<button aria-label="v${i}">v</button>`,
    ).join("");
    const snapshotVisible = await inspect(visibleOverflow);
    expect(snapshotVisible.truncated).toBe(true);
  });
});
