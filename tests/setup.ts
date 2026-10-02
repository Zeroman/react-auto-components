import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// style.css sets this on :root. Unit tests do not load the stylesheet.
document.documentElement.style.setProperty("--auto-text", "#202e29");

afterEach(() => {
  cleanup();
  localStorage.clear();
});
