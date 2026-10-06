import type { useAutoNavigation } from "@zeroman.yang/react-auto-components";

type Nav = ReturnType<typeof useAutoNavigation>;

declare global {
  // eslint-disable-next-line no-var
  var __racNav: Nav | undefined;
}

/**
 * Browser side of the rac-devtools bridge. Only imported in dev (see main.tsx).
 * Relays CLI commands to the navigation engine, drives the DOM, and pushes
 * state, console, and error events back over the vite HMR websocket.
 *
 * Every page load gets its own clientId. Commands carry the target clientId of
 * the most recently loaded page, so stale or reloading tabs silently ignore
 * commands that were not addressed to them.
 */
if (import.meta.hot) {
  const hot = import.meta.hot;
  const clientId = crypto.randomUUID();
  // Tests and external tools pin commands to this tab through it.
  (globalThis as { __racClientId?: string }).__racClientId = clientId;
  let attached: Nav | undefined;

  const send = (payload: Record<string, unknown>) =>
    hot.send("rac:event", { clientId, ...payload });

  const attach = () => {
    const nav = globalThis.__racNav;
    if (!nav || attached === nav) return !!attached;
    attached = nav;
    nav.subscribe(() => send({ kind: "state", ...nav.getState() }));
    send({ kind: "ready" });
    setInterval(() => send({ kind: "ping", clientId }), 2000);
    return true;
  };

  const timer = setInterval(() => {
    if (attach()) clearInterval(timer);
  }, 250);
  setTimeout(() => clearInterval(timer), 60000);

  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args: unknown[]) => {
    send({ kind: "console", level: "warn", text: args.map(String).join(" ") });
    originalWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    send({ kind: "console", level: "error", text: args.map(String).join(" ") });
    originalError(...args);
  };
  window.addEventListener("error", (event) =>
    send({ kind: "console", level: "error", text: String(event.message) }),
  );
  window.addEventListener("unhandledrejection", (event) =>
    send({ kind: "console", level: "error", text: String(event.reason) }),
  );

  function find(testid: string): HTMLElement | null {
    return document.querySelector(`[data-testid="${CSS.escape(testid)}"]`);
  }

  const commands: Record<
    string,
    (payload: Record<string, unknown>) => unknown
  > = {
    click({ testid }) {
      const el = find(String(testid));
      el?.click();
      return { clicked: !!el };
    },
    fill({ testid, value }) {
      const el = find(String(testid)) as
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (!el) return { filled: false };
      if (el instanceof HTMLSelectElement) {
        el.value = String(value);
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        const proto =
          el instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        setter?.call(el, String(value));
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return { filled: true, value: el.value };
    },
    dom({ testid }) {
      const el = find(String(testid));
      if (!el) return { found: false };
      return {
        found: true,
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().slice(0, 2000) ?? "",
        visible: !!el.offsetParent || el.getClientRects().length > 0,
      };
    },
    async wait({ testid, timeout = 5000 }) {
      const deadline = Date.now() + Number(timeout);
      while (Date.now() < deadline) {
        if (find(String(testid))) return { found: true };
        await new Promise((r) => setTimeout(r, 100));
      }
      return { found: !!find(String(testid)) };
    },
    eval({ code }) {
      const source = String(code);
      try {
        const value = new Function(`return (${source})`)();
        try {
          return { ok: true, value: JSON.parse(JSON.stringify(value ?? null)) };
        } catch {
          return { ok: true, value: String(value) };
        }
      } catch {
        return { ok: true, value: String(new Function(source)()) };
      }
    },
  };

  hot.on("rac:cmd", async (message: unknown) => {
    // vite 8 hands the full custom-event envelope to raw-socket sends; the
    // wrapper path delivers the data directly. Accept both shapes.
    const envelope = (message ?? {}) as {
      id?: string;
      cmd?: string;
      target?: string;
      payload?: { target?: string; params?: Record<string, string | null> };
      data?: {
        id?: string;
        cmd?: string;
        target?: string;
        payload?: { target?: string; params?: Record<string, string | null> };
      };
    };
    const id = envelope.id ?? envelope.data?.id;
    const cmd = envelope.cmd ?? envelope.data?.cmd;
    const target = envelope.target ?? envelope.data?.target;
    const payload = envelope.payload ?? envelope.data?.payload;
    if (target && target !== clientId) return; // addressed to another page
    try {
      const nav = globalThis.__racNav;
      if (!nav) throw new Error("navigation engine not mounted yet");
      const options = {
        params:
          (payload?.params as Record<string, string> | undefined) ?? undefined,
      };
      let data: unknown;
      if (cmd === "state") data = nav.getState();
      else if (cmd === "goto")
        data = await nav.goto(payload?.target ?? "", options);
      else if (cmd === "replace")
        data = await nav.replace(payload?.target ?? "", options);
      else if (cmd === "setParams")
        data = await nav.setParams(
          (payload?.params ?? {}) as Parameters<typeof nav.setParams>[0],
        );
      else if (cmd && cmd in commands)
        data = await commands[cmd]((payload ?? {}) as Record<string, unknown>);
      else throw new Error(`unknown command "${cmd}"`);
      hot.send("rac:result", { id, ok: true, data });
    } catch (error) {
      hot.send("rac:result", { id, ok: false, error: String(error) });
    }
  });
}
