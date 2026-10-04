import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const css = readFileSync(resolve("src/styles/base.css"), "utf8");

test("dark theme follows the OS and can be forced via data-auto-theme", () => {
  expect(css).toContain("@media (prefers-color-scheme: dark)");
  expect(css).toContain(':root:not([data-auto-theme="light"])');
  expect(css).toContain('[data-auto-theme="dark"]');
});

test("theme tokens cover every base color in both light and dark blocks", () => {
  const tokens = [
    "--auto-accent",
    "--auto-accent-soft",
    "--auto-bg",
    "--auto-muted",
    "--auto-text",
    "--auto-secondary",
    "--auto-border",
    "--auto-danger",
    "--auto-on-accent",
    "--auto-scrim",
    "--auto-shadow-overlay",
    "--auto-shadow-soft",
  ];
  const darkBlock = css.slice(
    css.indexOf("@media (prefers-color-scheme: dark)"),
    css.indexOf('[data-auto-theme="dark"]'),
  );
  const forcedBlock = css.slice(css.indexOf('[data-auto-theme="dark"]'));
  for (const token of tokens) {
    expect(darkBlock, `${token} in media dark block`).toContain(token);
    expect(forcedBlock, `${token} in forced dark block`).toContain(token);
  }
});

test("no raw scrim/shadow colors remain outside the theme blocks", () => {
  const body = css.slice(css.indexOf(".auto-root"));
  expect(body).not.toContain("#13271e66");
  expect(body).not.toContain("#0b261e40");
  expect(body).not.toContain("#0000001f");
});
