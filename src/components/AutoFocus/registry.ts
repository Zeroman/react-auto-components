import { RacError } from "../../core/errors";
import type { AutoFocusProps } from "./index";

const nativeFocusable =
  "input:not([type='hidden']), textarea, select, button, a[href], area[href], iframe, audio[controls], video[controls]";
const focusable = `${nativeFocusable}, summary, [tabindex], [contenteditable]`;

type Options = Pick<AutoFocusProps, "target" | "disabled">;
type Entry = {
  root: HTMLElement;
  options: () => Options;
  candidates: HTMLElement[];
  resolved: HTMLElement | null;
  dirty: boolean;
};
const registries = new WeakMap<Document, ReturnType<typeof createRegistry>>();

function isShown(element: HTMLElement, checkBox = true): boolean {
  if (!element.isConnected || element.closest("[inert]")) return false;
  const view = element.ownerDocument.defaultView;
  if (!view) return false;
  for (
    let parent: HTMLElement | null = element;
    parent;
    parent = parent.parentElement
  ) {
    const style = view.getComputedStyle(parent);
    if (style.display === "none" || style.contentVisibility === "hidden")
      return false;
    if (parent.tagName === "DETAILS" && !parent.hasAttribute("open")) {
      const summary = parent.querySelector(":scope > summary");
      if (!summary?.contains(element)) return false;
    }
  }
  // visibility is inherited but descendants may explicitly override it.
  const visibility = view.getComputedStyle(element).visibility;
  if (visibility === "hidden" || visibility === "collapse") return false;
  // This checks layout visibility, not intersection with the viewport. The
  // style checks above also support DOM environments without checkVisibility.
  return (
    !checkBox ||
    typeof element.checkVisibility !== "function" ||
    element.checkVisibility({ checkVisibilityCSS: true })
  );
}

function isAvailable(element: HTMLElement, explicit: boolean): boolean {
  if (element.matches(":disabled") || !isShown(element)) return false;
  const tabIndex = element.getAttribute("tabindex");
  if (tabIndex !== null && /^[+-]?\d+$/.test(tabIndex.trim()))
    return explicit || Number(tabIndex) >= 0;
  if (element.matches(nativeFocusable)) return true;
  if (element.tagName === "SUMMARY") {
    return (
      element.parentElement?.tagName === "DETAILS" &&
      element.parentElement.querySelector(":scope > summary") === element
    );
  }
  return (
    element.matches(
      '[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
    ) && !element.parentElement?.isContentEditable
  );
}

function validateTarget(root: HTMLElement, { target }: Options) {
  if (typeof target !== "string") return;
  try {
    root.matches(target);
  } catch {
    throw new RacError(
      "AutoFocus",
      "RAC-FOCUS-TARGET",
      `Invalid target selector ${JSON.stringify(target)}.`,
      "Pass a valid CSS selector or a DOM ref to AutoFocus target.",
    );
  }
}

function refreshEntry(entry: Entry) {
  const { target, disabled } = entry.options();
  const external = target !== undefined && typeof target !== "string";
  // Reuse this single candidate collection for resolution and ResizeObserver.
  entry.candidates = external
    ? target.current
      ? [target.current]
      : []
    : Array.from(entry.root.querySelectorAll<HTMLElement>(target ?? focusable));
  entry.resolved =
    disabled ||
    !entry.root.isConnected ||
    (external && !isShown(entry.root, false))
      ? null
      : (entry.candidates.find((element) =>
          isAvailable(element, target !== undefined),
        ) ?? null);
  entry.dirty = false;
}

// Track declarations as well as external ref targets. Ancestor attributes can
// control visibility through arbitrary CSS, so an attributeFilter is unsafe.
function roots(entry: Entry): HTMLElement[] {
  const { target } = entry.options();
  if (!target || typeof target === "string") return [entry.root];
  // React clears refs before removal notifications. Retain the old target
  // until refresh so an independently unmounted editor invalidates its cache.
  return target.current
    ? [entry.root, ...entry.candidates, target.current]
    : [entry.root, ...entry.candidates];
}

function affects(entry: Entry, mutation: MutationRecord): boolean {
  return roots(entry).some((root) => {
    if (root.contains(mutation.target)) return true;
    if (mutation.type !== "childList") return mutation.target.contains(root);
    // Adding an unrelated sibling to body must not invalidate every entry.
    return [...mutation.addedNodes, ...mutation.removedNodes].some((node) =>
      node.contains(root),
    );
  });
}

function createRegistry(doc: Document) {
  const view = doc.defaultView!;
  const entries: Entry[] = [];
  let winner: HTMLElement | null = null;
  let frame: number | undefined;
  const observed = new Set<Element>();
  const resize =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver((records) => {
          invalidate((entry) =>
            records.some(({ target }) =>
              entry.candidates.includes(target as HTMLElement),
            ),
          );
        });
  const mutations = new MutationObserver((records) => {
    const stylesheetChanged = records.some(
      (record) =>
        (record.target.nodeType === 1
          ? (record.target as Element)
          : record.target.parentElement
        )?.closest("style, link") ||
        [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            node.nodeType === 1 &&
            ((node as Element).matches("style, link") ||
              (node as Element).querySelector("style, link")),
        ),
    );
    invalidate(
      (entry) =>
        stylesheetChanged || records.some((record) => affects(entry, record)),
    );
  });

  function invalidate(affected: (entry: Entry) => boolean) {
    let changed = false;
    for (const entry of entries) {
      if (!affected(entry)) continue;
      entry.dirty = true;
      changed = true;
    }
    if (changed) schedule();
  }

  function invalidateAll() {
    invalidate(() => true);
  }

  function schedule() {
    if (frame === undefined) frame = view.requestAnimationFrame(flush);
  }

  function flush() {
    frame = undefined;
    let next: HTMLElement | null = null;
    const targets = new Set<Element>();
    for (const entry of entries) {
      if (entry.dirty) refreshEntry(entry);
      // Keep hidden candidates observed so CSS layout changes can reveal them.
      for (const element of entry.candidates) targets.add(element);
      if (entry.resolved) next = entry.resolved;
    }
    if (resize) {
      for (const element of observed)
        if (!targets.has(element)) {
          resize.unobserve(element);
          observed.delete(element);
        }
      for (const element of targets)
        if (!observed.has(element)) {
          resize.observe(element);
          observed.add(element);
        }
    }
    if (next === winner) return;
    winner = next;
    if (next && doc.activeElement !== next) next.focus({ preventScroll: true });
  }

  mutations.observe(doc.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
  });
  view.addEventListener("resize", invalidateAll);
  doc.addEventListener("transitionend", invalidateAll, true);
  doc.addEventListener("animationend", invalidateAll, true);
  doc.addEventListener("toggle", invalidateAll, true);
  doc.addEventListener("load", invalidateAll, true);

  return {
    add(entry: Entry) {
      entries.push(entry);
      schedule();
      return {
        refresh() {
          validateTarget(entry.root, entry.options());
          entry.dirty = true;
          schedule();
        },
        unregister() {
          const index = entries.indexOf(entry);
          if (index < 0) return;
          entries.splice(index, 1);
          if (entries.length) {
            schedule();
            return;
          }
          mutations.disconnect();
          resize?.disconnect();
          if (frame !== undefined) view.cancelAnimationFrame(frame);
          view.removeEventListener("resize", invalidateAll);
          doc.removeEventListener("transitionend", invalidateAll, true);
          doc.removeEventListener("animationend", invalidateAll, true);
          doc.removeEventListener("toggle", invalidateAll, true);
          doc.removeEventListener("load", invalidateAll, true);
          registries.delete(doc);
        },
      };
    },
  };
}

export function registerAutoFocus(root: HTMLElement, options: () => Options) {
  validateTarget(root, options());
  const doc = root.ownerDocument;
  let registry = registries.get(doc);
  if (!registry) {
    registry = createRegistry(doc);
    registries.set(doc, registry);
  }
  return registry.add({
    root,
    options,
    candidates: [],
    resolved: null,
    dirty: true,
  });
}
