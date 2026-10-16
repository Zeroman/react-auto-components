import { expect, test } from "vitest";
import { formatConsoleValue } from "../packages/devtools/src/client";

test("console traversal applies its depth bound to nested objects and Error causes", () => {
  let value: unknown = { secretAtDepthTen: "must not traverse" };
  for (let i = 0; i < 10; i++) value = { child: value };
  expect(formatConsoleValue(value)).not.toContain("secretAtDepthTen");
  let error = new Error("deepest-cause-marker");
  for (let i = 0; i < 10; i++)
    error = new Error(`wrapper-${i}`, { cause: error });
  expect(formatConsoleValue(error)).not.toContain("deepest-cause-marker");
});

test("arrays share the total property-read budget across primitive entries", () => {
  let reads = 0;
  const lists = Array.from({ length: 10 }, () => {
    const list = new Array(100);
    for (let index = 0; index < list.length; index++)
      Object.defineProperty(list, index, {
        get: () => {
          reads++;
          return "value";
        },
      });
    return list;
  });
  formatConsoleValue(lists);
  expect(reads).toBeLessThanOrEqual(50);
});

test("unserializable results become a structured failure, and serializers run once", async () => {
  const { limitResult } = await import("../packages/devtools/src/client");
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  for (const data of [cyclic, 1n]) {
    const result = limitResult({ id: "r1", ok: true, data });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "RAC-DEVTOOLS-RESULT" },
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  }
  let calls = 0;
  const result = limitResult({
    id: "r2",
    ok: true,
    data: {
      toJSON() {
        calls++;
        if (calls > 1) throw new Error("serialized twice");
        return "stable";
      },
    },
  });
  expect(JSON.stringify(result)).toContain("stable");
  expect(calls).toBe(1);
});
