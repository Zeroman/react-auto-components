import type { Browser, Page } from "playwright";
import { RacError } from "./errors.js";

export class BrowserController {
  private owned?: Browser;
  private external?: Browser;
  private ownedHeadless?: boolean;
  private operations: Promise<unknown> = Promise.resolve();
  private closed = false;
  private run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operations.then(() => {
      if (this.closed)
        throw new RacError(
          "RAC-DEVTOOLS-BROWSER",
          "The browser controller is shutting down.",
          "Restart the development server before opening another managed page.",
        );
      return operation();
    });
    this.operations = result.catch(() => {});
    return result;
  }
  constructor(private endpoint?: string) {}
  private async chromium() {
    try {
      return (await import("playwright")).chromium;
    } catch {
      throw new RacError(
        "RAC-DEVTOOLS-BROWSER",
        "Playwright is not installed.",
        "Install playwright as a dev dependency and run pnpm exec playwright install chromium.",
      );
    }
  }
  open(url: string, headless: boolean) {
    return this.run(() => this.openPage(url, headless));
  }
  private async openPage(url: string, headless: boolean) {
    const chromium = await this.chromium();
    if (this.owned?.isConnected() && this.ownedHeadless !== headless)
      throw new RacError(
        "RAC-DEVTOOLS-BROWSER",
        "The managed browser already uses a different headless setting.",
        "Reuse the current mode or restart the development server; existing pages will not be closed implicitly.",
      );
    if (!this.owned?.isConnected()) {
      try {
        this.owned = await chromium.launch({ headless });
        this.ownedHeadless = headless;
      } catch (error) {
        throw new RacError(
          "RAC-DEVTOOLS-BROWSER",
          String(error instanceof Error ? error.message : error),
          "Install Chromium with pnpm exec playwright install chromium. Use rac open --headless when no display is available.",
        );
      }
    }
    const page = await this.owned.newPage();
    try {
      await page.goto(url);
      await page.waitForFunction(
        () => Boolean((globalThis as { __racPageId?: string }).__racPageId),
        {},
        { timeout: 15000 },
      );
      return await page.evaluate(
        () => (globalThis as { __racPageId?: string }).__racPageId!,
      );
    } catch (error) {
      await page.close().catch(() => {});
      throw new RacError(
        "RAC-PAGE-DISCONNECTED",
        `The managed page did not connect: ${String(error instanceof Error ? error.message : error)}`,
        `Check that the app loads at ${url} and permits the DevTools page client, then run rac open again.`,
      );
    }
  }
  private async find(pageId: string): Promise<Page | undefined> {
    if (this.endpoint && !this.external?.isConnected())
      this.external = await (
        await this.chromium()
      ).connectOverCDP(this.endpoint);
    for (const browser of [this.owned, this.external]) {
      if (!browser?.isConnected()) continue;
      for (const context of browser.contexts())
        for (const page of context.pages()) {
          const id = await page
            .evaluate(
              () => (globalThis as { __racPageId?: string }).__racPageId,
            )
            .catch(() => undefined);
          if (id === pageId) return page;
        }
    }
  }
  shot(pageId: string, fullPage = false) {
    return this.run(() => this.capture(pageId, fullPage));
  }
  private async capture(pageId: string, fullPage: boolean) {
    const page = await this.find(pageId);
    if (!page)
      throw new RacError(
        "RAC-DEVTOOLS-SCREENSHOT",
        "The selected page has no screenshot connection.",
        "Use a page created by rac open, or configure browserEndpoint for this page's Chromium browser. No substitute page will be created.",
      );
    return page.screenshot({ fullPage, type: "png", timeout: 10000 });
  }
  async dispose() {
    this.closed = true;
    await this.operations;
    await this.owned?.close().catch(() => {});
    // Closing a CDP connection disconnects Playwright without closing the external browser.
    await this.external?.close().catch(() => {});
  }
}
