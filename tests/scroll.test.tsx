import { test, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutoScroll } from "../src/components/AutoScroll";
afterEach(() => vi.restoreAllMocks());
test("virtual list bounds mounted rows", () => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(300);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
  render(
    <AutoScroll
      items={Array.from({ length: 10000 }, (_, i) => i)}
      height={300}
      renderItem={(i) => <span data-testid="row">{i}</span>}
      getKey={(i) => i}
    />,
  );
  expect(screen.getAllByTestId("row").length).toBeLessThan(30);
  expect(screen.getAllByTestId("row").length).toBeGreaterThan(0);
});
