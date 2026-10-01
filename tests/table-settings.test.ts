import { test, expect } from "vitest";
import {
  reconcileSettings,
  initialSettings,
} from "../src/components/AutoTable/settings";
test("new columns join layout and removed columns disappear while intentional hiding remains", () => {
  const saved = initialSettings(["a", "b"]);
  saved.layout.presets[0].value.hidden = ["b"];
  const next = reconcileSettings(saved, ["b", "c"], {});
  expect(next.layout.presets[0].value.order).toEqual(["b", "c"]);
  expect(next.layout.presets[0].value.hidden).toEqual(["b"]);
});
test("version changes only reset their own preset category", () => {
  const saved = initialSettings(["a"]);
  saved.sort.presets[0].value = [{ id: "a", desc: true }];
  saved.layout.presets[0].value.density = "compact";
  const next = reconcileSettings(saved, ["a"], { sort: 2 });
  expect(next.sort.presets[0].value).toEqual([]);
  expect(next.layout.presets[0].value.density).toBe("compact");
});
