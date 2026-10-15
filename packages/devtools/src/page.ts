import { RacError } from "./errors.js";
import type { NavigationAdapter } from "./protocol.js";

const componentSelectors: Record<string, string> = {
  AutoForm: "form.auto-form",
  AutoTable: ".auto-table",
  AutoSearch: ".auto-search",
  AutoDialog: ".auto-dialog",
  AutoTabs: ".auto-tabs",
  AutoMenu: ".auto-menu",
  AutoChat: ".auto-chat",
};
const interactive =
  'button,input:not([type="hidden"]),textarea,select,a[href],[role="button"],[role="tab"],[role="combobox"],[contenteditable="true"],form';
export function createPageDriver(allowEval = false) {
  let serial = 0;
  const documentId = crypto.randomUUID().slice(0, 8);
  let refs = new Map<string, HTMLElement>();
  const visible = (el: HTMLElement) =>
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== "hidden" &&
    !el.closest('[hidden],[inert],[aria-hidden="true"]');
  const label = (el: HTMLElement) => {
    const labelled = el
      .getAttribute("aria-labelledby")
      ?.split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");
    const labels =
      "labels" in el
        ? Array.from((el as HTMLInputElement).labels ?? [])
            .map((l) => l.textContent ?? "")
            .join(" ")
        : "";
    return (
      el.getAttribute("aria-label") ||
      labelled ||
      labels ||
      el.getAttribute("placeholder") ||
      el.textContent ||
      el.getAttribute("title") ||
      ""
    )
      .trim()
      .slice(0, 200);
  };
  const role = (el: HTMLElement) =>
    el.getAttribute("role") ??
    {
      BUTTON: "button",
      SELECT: "combobox",
      TEXTAREA: "textbox",
      A: "link",
      FORM: "form",
      INPUT:
        (el as HTMLInputElement).type === "checkbox" ? "checkbox" : "textbox",
    }[el.tagName] ??
    el.tagName.toLowerCase();
  function lookup(ref: unknown) {
    const el = refs.get(String(ref));
    if (!el?.isConnected)
      throw new RacError(
        "RAC-PAGE-REF",
        "The element reference is missing or stale.",
        "Run rac inspect --page <pageId> and use a ref from that inspection.",
      );
    return el;
  }
  function actionable(el: HTMLElement) {
    if (
      !visible(el) ||
      el.matches(':disabled,[aria-disabled="true"]') ||
      el.closest("[inert]")
    )
      throw new RacError(
        "RAC-PAGE-ACTION",
        "The element is hidden or disabled.",
        "Inspect the page and wait until the target is visible and enabled.",
      );
  }
  function adapters() {
    const detail: { adapters: NavigationAdapter[] } = { adapters: [] };
    window.dispatchEvent(
      new CustomEvent("rac:discover-navigation", { detail }),
    );
    return detail.adapters;
  }
  function navigation() {
    const found = adapters();
    if (found.length !== 1)
      throw new RacError(
        "RAC-PAGE-NAVIGATION",
        found.length
          ? "Several navigation providers are mounted."
          : "This page has no RAC navigation provider.",
        "Mount one AutoNavigationProvider for navigation commands, or use the page's visible controls.",
      );
    return found[0];
  }
  function fieldState(el: HTMLElement) {
    const input =
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement;
    return {
      ...(input
        ? {
            value:
              el instanceof HTMLInputElement && el.type === "password"
                ? undefined
                : el.value,
            readOnly: el.hasAttribute("readonly"),
            invalid:
              !el.validity.valid || el.getAttribute("aria-invalid") === "true",
          }
        : {}),
      ...(el instanceof HTMLInputElement &&
      ["checkbox", "radio"].includes(el.type)
        ? { checked: el.checked }
        : {}),
      ...(el instanceof HTMLSelectElement
        ? {
            options: Array.from(el.options).map((option) => ({
              value: option.value,
              label: option.label,
              disabled: option.disabled,
            })),
          }
        : {}),
      ...(el.getAttribute("aria-selected")
        ? { selected: el.getAttribute("aria-selected") === "true" }
        : {}),
    };
  }
  function inspect() {
    refs = new Map();
    const components = Object.entries(componentSelectors).flatMap(
      ([type, selector]) =>
        Array.from(document.querySelectorAll<HTMLElement>(selector))
          .filter(visible)
          .map((el) => {
            const ref = `${documentId}_e${++serial}`;
            refs.set(ref, el);
            return {
              ref,
              type,
              name:
                el.getAttribute("aria-label") ??
                el.getAttribute("data-testid") ??
                type,
              actions: ["dom"],
              el,
            };
          }),
    );
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(interactive),
    )
      .filter(visible)
      .slice(0, 300)
      .map((el) => {
        const ref = `${documentId}_e${++serial}`;
        refs.set(ref, el);
        const actions =
          el instanceof HTMLFormElement
            ? ["submit", "validate", "dom"]
            : ["click", "dom", "wait"];
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLSelectElement ||
          el instanceof HTMLTextAreaElement ||
          el.isContentEditable
        )
          actions.push("fill");
        const component = components.find((c) => c.el.contains(el));
        return {
          ...fieldState(el),
          ref,
          role: role(el),
          name: label(el),
          tag: el.tagName.toLowerCase(),
          field: el.getAttribute("name") ?? undefined,
          testid: el.getAttribute("data-testid") ?? undefined,
          disabled: el.matches(':disabled,[aria-disabled="true"]'),
          required: el.hasAttribute("required"),
          actions,
          component: component?.name,
        };
      });
    const nav = adapters();
    return {
      title: document.title,
      url: location.href,
      alerts: Array.from(
        document.querySelectorAll<HTMLElement>('[role="alert"]'),
      )
        .filter(visible)
        .map((el) => el.textContent?.trim().slice(0, 500)),
      elements,
      components: components.map(({ el, ...component }) => ({
        ...component,
        fields: elements
          .filter((e) => refs.get(e.ref) && el.contains(refs.get(e.ref)!))
          .map((e) => e.ref),
      })),
      navigation:
        nav.length === 1
          ? { available: true, state: nav[0].getState() }
          : { available: false, providers: nav.length },
      truncated: document.querySelectorAll(interactive).length > 300,
    };
  }
  async function execute(
    cmd: string,
    payload: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (cmd === "inspect") return inspect();
    if (cmd === "state") return navigation().getState();
    if (cmd === "goto" || cmd === "replace") {
      if (typeof payload.target !== "string")
        throw new RacError(
          "RAC-DEVTOOLS-INPUT",
          "Navigation needs a target string.",
          "Pass a route such as rac goto table:local --page <pageId>.",
        );
      return navigation()[cmd](payload.target, {
        params: payload.params as Record<string, string> | undefined,
      });
    }
    if (cmd === "setParams")
      return navigation().setParams(
        (payload.params as Record<string, string | null>) ?? {},
      );
    if (cmd === "eval") {
      if (!allowEval)
        throw new RacError(
          "RAC-DEVTOOLS-EVAL",
          "JavaScript evaluation is disabled.",
          "Explicitly set allowEval: true in the development plugin if evaluation is required.",
        );
      // Exactly one evaluation: never retry a throwing expression as a statement.
      const source = String(payload.code ?? "");
      let fn: () => unknown;
      try {
        fn = new Function(`return (${source})`) as () => unknown;
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        fn = new Function(source) as () => unknown;
      }
      const value = await fn();
      return value === undefined ? null : value;
    }
    const el = lookup(payload.ref);
    if (cmd === "dom")
      return {
        ...fieldState(el),
        text: el.textContent?.trim().slice(0, 4000),
        visible: visible(el),
        tag: el.tagName.toLowerCase(),
      };
    if (cmd === "wait") {
      const timeout = Number(payload.timeout ?? 5000);
      const deadline = Date.now() + Math.min(Math.max(timeout, 1), 30000);
      while (Date.now() < deadline) {
        if (el.isConnected && visible(el)) return { visible: true };
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new RacError(
        "RAC-DEVTOOLS-TIMEOUT",
        "The referenced element did not become visible.",
        "Inspect the page again; use a current ref and check the application's loading state.",
      );
    }
    actionable(el);
    if (cmd === "click") {
      el.click();
      return { executed: true };
    }
    if (cmd === "fill") {
      const value = String(payload.value ?? "");
      if (el.matches("[readonly]"))
        throw new RacError(
          "RAC-PAGE-ACTION",
          "The field is read-only.",
          "Choose an editable field from rac inspect.",
        );
      if (
        el instanceof HTMLInputElement &&
        ["checkbox", "radio"].includes(el.type)
      ) {
        if (!["true", "false"].includes(value))
          throw new RacError(
            "RAC-DEVTOOLS-INPUT",
            "Checkbox and radio values must be true or false.",
            "Pass true or false as the fill value.",
          );
        if (el.checked !== (value === "true")) el.click();
        if (el.checked !== (value === "true"))
          throw new RacError(
            "RAC-PAGE-ACTION",
            "The control did not accept that checked state.",
            "Choose the intended radio option or inspect the controlled field.",
          );
      } else if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        if (
          el instanceof HTMLInputElement &&
          ["file", "button", "submit", "reset", "image", "hidden"].includes(
            el.type,
          )
        )
          throw new RacError(
            "RAC-PAGE-ACTION",
            "This input does not support text filling.",
            "Use an action supported by the selected input type.",
          );
        if (
          el instanceof HTMLSelectElement &&
          !Array.from(el.options).some((o) => o.value === value && !o.disabled)
        )
          throw new RacError(
            "RAC-PAGE-ACTION",
            "The requested select option is unavailable.",
            "Inspect the select's options and choose an enabled value.",
          );
        const proto =
          el instanceof HTMLInputElement
            ? HTMLInputElement.prototype
            : el instanceof HTMLTextAreaElement
              ? HTMLTextAreaElement.prototype
              : HTMLSelectElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (el.isContentEditable) {
        el.textContent = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } else
        throw new RacError(
          "RAC-PAGE-ACTION",
          "The selected element is not an editable field.",
          "Choose a ref whose actions include fill.",
        );
      return { executed: true };
    }
    if (
      (cmd === "submit" || cmd === "validate") &&
      el instanceof HTMLFormElement
    ) {
      const valid = el.checkValidity();
      if (cmd === "submit" && valid) el.requestSubmit();
      return {
        valid,
        submitted: cmd === "submit" && valid,
        validation: "native",
      };
    }
    throw new RacError(
      "RAC-PAGE-ACTION",
      `Unsupported action "${cmd}" for this element.`,
      "Use an action returned by rac inspect.",
    );
  }
  return { execute };
}
