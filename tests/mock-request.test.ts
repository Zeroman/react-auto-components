import { afterEach, expect, test, vi } from "vitest";
import { mockRequest } from "../test-project/src/examples/mock/MockDemo";

afterEach(() => vi.useRealTimers());

test("mock responses cross an async boundary and do not share mutable records", async () => {
  vi.useFakeTimers();
  const record = { fields: [{ label: "Name" }] };
  let settled = false;
  const response = mockRequest(record).then((value) => {
    settled = true;
    return value;
  });
  await vi.advanceTimersByTimeAsync(349);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  const result = await response;
  result.fields[0].label = "Edited";
  expect(record.fields[0].label).toBe("Name");
});

test("aborted mock requests reject and cannot deliver a stale response", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const request = mockRequest({ id: 1 }, { signal: controller.signal });
  const rejected = expect(request).rejects.toMatchObject({
    name: "AbortError",
  });
  controller.abort();
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
});

test("already aborted requests never resolve", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    mockRequest([], { signal: controller.signal }),
  ).rejects.toMatchObject({ name: "AbortError" });
});

test("failed mock responses reject instead of returning usable data", async () => {
  vi.useFakeTimers();
  const request = mockRequest({ id: 1 }, { fail: true });
  const rejected = expect(request).rejects.toThrow("mock.requestFailed");
  await vi.runAllTimersAsync();
  await rejected;
});
