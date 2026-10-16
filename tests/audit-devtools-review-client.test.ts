import { afterEach, describe, expect, test, vi } from "vitest";
// Review round, part 2: UTF-8 envelope bounds (success AND error results)
// and the real start() client lifecycle against a mocked transport.
import {
  formatConsoleValue,
  limitResult,
} from "../packages/devtools/src/client";

const utf8 = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value) ?? "", "utf8");

describe("result envelope bounds", () => {
  test("bounds are measured in UTF-8 bytes, not UTF-16 code units", () => {
    const small = { id: "c1", ok: true, data: "ok" };
    expect(limitResult(small)).toEqual(small);
    // 300k code units of 3-byte characters: under 512KiB code units would be
    // misread as "small"; in UTF-8 it is ~900KiB.
    const unicode = { id: "c2", ok: true, data: "水".repeat(300_000) };
    expect(unicode.data.length).toBeLessThan(512 * 1024);
    const limited = limitResult(unicode as unknown as typeof small);
    expect(limited.ok).toBe(false);
    expect(utf8(limited)).toBeLessThanOrEqual(512 * 1024);
    expect((limited as { error?: { code?: string } }).error?.code).toBe(
      "RAC-DEVTOOLS-RESULT",
    );
  });

  test("oversized ASCII results stay bounded", () => {
    const big = { id: "c3", ok: true, data: "x".repeat(2 ** 21) };
    const limited = limitResult(big);
    expect(utf8(limited)).toBeLessThanOrEqual(512 * 1024);
  });

  test("a failing result with a giant problem detail is also bounded", () => {
    const failing = {
      id: "c4",
      ok: false,
      error: {
        code: "RAC-PAGE-ACTION",
        problem: `boom ${"y".repeat(2 ** 21)}`,
        fix: "Inspect the page.",
      },
    };
    const limited = limitResult(failing);
    expect(utf8(limited)).toBeLessThanOrEqual(512 * 1024);
    expect(limited.ok).toBe(false);
    const error = (limited as { error?: { code?: string; problem?: string } })
      .error;
    expect(error?.code).toBe("RAC-PAGE-ACTION");
    expect(error?.problem?.length).toBeLessThanOrEqual(2001);
  });
});

describe("console serialization is bounded and never throws", () => {
  test("deep nesting and huge arrays terminate quickly and stay bounded", () => {
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 10_000; i++) deep = { child: deep };
    const huge = Array.from({ length: 1_000_000 }, (_, i) => ({ i }));
    for (const hostile of [deep, huge]) {
      const text = formatConsoleValue(hostile);
      expect(text.length).toBeLessThanOrEqual(4000);
    }
  });

  test("hostile values (throwing toString, cyclic, nested Error cause) never throw", () => {
    const hostile = {
      toString() {
        throw new Error("nope");
      },
    };
    const cyclic: Record<string, unknown> = { name: "c" };
    cyclic.self = cyclic;
    const nested = new Error("outer", { cause: new Error("inner") });
    const output = [
      formatConsoleValue(hostile),
      formatConsoleValue(cyclic),
      formatConsoleValue(nested),
    ];
    for (const text of output) {
      expect(typeof text).toBe("string");
      expect(text.length).toBeLessThanOrEqual(4000);
    }
    expect(output[2]).toContain("outer");
    expect(output[2]).toContain("inner");
    expect(output[0]).not.toContain("nope");
  });

  test("getter values are read at most 50 times across the whole traversal", () => {
    let reads = 0;
    const root = {
      a: {
        get value() {
          reads++;
          return "x";
        },
      },
      b: {
        c: {
          get value() {
            reads++;
            return "y";
          },
        },
      },
    };
    // Also give it more keys than the budget so the loop must stop early.
    const wide: Record<string, unknown> = { root };
    for (let i = 0; i < 200; i++)
      wide[`k${i}`] = {
        get v() {
          reads++;
          return i;
        },
      };
    const text = formatConsoleValue(wide);
    expect(reads).toBeLessThanOrEqual(50);
    expect(text.length).toBeLessThanOrEqual(4000);
  });

  test("Error.cause cycles and very deep cause chains stay finite", () => {
    const cyclic: Error & { cause?: unknown } = new Error("loop");
    cyclic.cause = cyclic;
    expect(() => formatConsoleValue(cyclic)).not.toThrow();
    const text = formatConsoleValue(cyclic);
    expect(text).toContain("loop");
    expect(text.length).toBeLessThanOrEqual(4000);

    let deep: Error = new Error("leaf");
    for (let i = 0; i < 1000; i++) deep = new Error(`l${i}`, { cause: deep });
    expect(() => formatConsoleValue(deep)).not.toThrow();
    expect(formatConsoleValue(deep).length).toBeLessThanOrEqual(4000);
  });

  test("root Error keeps readable message and stack", () => {
    const error = new Error("boom");
    const text = formatConsoleValue(error);
    expect(text.startsWith("Error: boom")).toBe(true);
    expect(text).toContain("    at ");
  });

  test("limitResult bounds giant code and fix fields too", () => {
    const failing = {
      id: "c9",
      ok: false,
      error: {
        code: `CODE ${"c".repeat(2 ** 20)}`,
        problem: "p",
        fix: `fix ${"f".repeat(2 ** 20)}`,
      },
    };
    const limited = limitResult(failing) as {
      error: { code: string; problem: string; fix: string };
    };
    expect(limited.error.code.length).toBeLessThanOrEqual(2001);
    expect(limited.error.fix.length).toBeLessThanOrEqual(2001);
    // Exact RESULT strings retained for the docs contract.
    const oversized = limitResult({
      id: "c10",
      ok: true,
      data: "x".repeat(2 ** 21),
    }) as unknown as {
      error: { code: string; problem: string; fix: string };
    };
    expect(oversized.error.code).toBe("RAC-DEVTOOLS-RESULT");
    expect(oversized.error.problem).toBe(
      "The command result exceeded 524288 UTF-8 bytes and was not delivered; the action itself already ran.",
    );
    expect(oversized.error.fix).toBe(
      "Narrow the command output (fewer elements, a smaller eval return) and inspect again.",
    );
  });
});

describe("start() client lifecycle with mocked transport", () => {
  test("oversized and unserializable results keep the page connected with no replay", async () => {
    const { start } = await import("../packages/devtools/src/client");
    const calls: { path: string; body: Record<string, unknown> }[] = [];
    const results: Record<string, unknown>[] = [];
    // Large success/error, cyclic result, then a small successful command.
    (globalThis as { __runs?: number }).__runs = 0;
    const commands = [
      {
        id: "cmd-1",
        cmd: "eval",
        payload: {
          code: "(() => { globalThis.__runs = (globalThis.__runs ?? 0) + 1; return '水'.repeat(300000); })()",
        },
      },
      {
        id: "cmd-2",
        cmd: "eval",
        payload: {
          code: "(() => { globalThis.__runs = (globalThis.__runs ?? 0) + 1; throw new Error('giant ' + 'z'.repeat(2**21)); })()",
        },
      },
      {
        id: "cmd-cycle",
        cmd: "eval",
        payload: {
          code: "(() => { globalThis.__runs++; const a = {}; a.self = a; return a; })()",
        },
      },
      {
        id: "cmd-3",
        cmd: "eval",
        payload: {
          code: "(() => { globalThis.__runs = (globalThis.__runs ?? 0) + 1; return 'done'; })()",
        },
      },
    ];
    const fetchMock = async (url: string | URL, init?: RequestInit) => {
      // The page client posts relative paths ("/__rac/<route>").
      const path = String(url);
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(String(init?.body ?? "{}")) as Record<
          string,
          unknown
        >;
      } catch {
        /* mock: tolerate unusable bodies */
      }
      calls.push({ path, body });
      const respond = (value: unknown, status = 200) => ({
        ok: status < 400,
        status,
        json: async () => value,
      });
      if (path.endsWith("/connect"))
        return respond({ pageId: "p_t", connectionId: "c_t" });
      if (path.endsWith("/poll")) {
        const command = commands.shift();
        // Park the loop once every command has been served.
        if (!command) return new Promise<never>(() => {});
        return respond(command);
      }
      if (path.endsWith("/result")) {
        results.push(body.result as Record<string, unknown>);
        return respond({ ok: true });
      }
      return respond({ ok: true });
    };
    vi.stubGlobal("fetch", vi.fn(fetchMock) as unknown as typeof fetch);

    const run = start({ token: "t", allowEval: true });
    run.catch((error: unknown) =>
      console.error(
        "START-FAILED",
        error instanceof Error ? error.stack : error,
      ),
    );
    const deadline = Date.now() + 5000;
    while (results.length < 4 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(results, JSON.stringify(calls.map((c) => c.path))).toHaveLength(4);

    // 1. Oversized success became a small structured failure envelope.
    expect(utf8(results[0])).toBeLessThanOrEqual(512 * 1024);
    expect(results[0]).toMatchObject({
      id: "cmd-1",
      ok: false,
      error: { code: "RAC-DEVTOOLS-RESULT" },
    });
    // 2. Oversized Error detail was bounded, code preserved.
    expect(utf8(results[1])).toBeLessThanOrEqual(512 * 1024);
    expect(results[1]).toMatchObject({ id: "cmd-2", ok: false });
    const err2 = results[1].error as { code?: string; problem?: string };
    expect(err2.code).toBe("RAC-DEVTOOLS-COMMAND");
    expect((err2.problem ?? "").length).toBeLessThanOrEqual(2001);
    // 3. The next command still executed exactly once — no replay, no
    // disconnect.
    expect(results[2]).toMatchObject({
      id: "cmd-cycle",
      ok: false,
      error: { code: "RAC-DEVTOOLS-RESULT" },
    });
    expect(results[3]).toMatchObject({ id: "cmd-3", ok: true });
    expect((globalThis as { __runs?: number }).__runs).toBe(4);
    // Every command id was delivered exactly once to /result.
    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(4);

    vi.unstubAllGlobals();
    void run;
  });
});
