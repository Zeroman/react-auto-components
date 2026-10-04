import { useEffect, useRef, useState } from "react";
import {
  createAutoAccess,
  type AutoAccessState,
} from "@zeroman.yang/react-auto-components";
import { mockRequest } from "./MockDemo";

export const initialDemoAccess: AutoAccessState = {
  userId: "user-1",
  roles: ["admin"],
  permissions: ["audit:read"],
  orgIds: ["org-1"],
};

const tabUserKey = "auto-studio:demo-tab-user";

function initialTabUser(): string | null {
  if (typeof window === "undefined") return "user-1";
  // A demo-only login choice, never an authentication credential.
  const requested = new URL(window.location.href).searchParams.get("demoUser");
  if (requested === "user-1" || requested === "user-2") return requested;
  try {
    const saved = window.sessionStorage.getItem(tabUserKey);
    if (saved === "") return null;
    if (saved === "user-1" || saved === "user-2") return saved;
  } catch {
    // Storage can be unavailable; in-memory tab isolation still works.
  }
  return "user-1";
}

function rememberTabUser(userId: string | null) {
  try {
    window.sessionStorage.setItem(tabUserKey, userId ?? "");
  } catch {
    // Persistence is optional for this demo.
  }
}

function demoProfile(userId: string): AutoAccessState {
  return userId === "user-1"
    ? initialDemoAccess
    : { userId, roles: ["guest"], permissions: [], orgIds: ["org-2"] };
}

/** Open the same demo in a separate tab with an explicit mock identity. */
export function demoUserHref(userId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set("demoUser", userId);
  return url.href;
}

/** Caller-owned API boundary. The component library performs no access requests. */
export function loadDemoAccess(
  userId: string,
  signal: AbortSignal,
  fail = false,
) {
  const payload = demoProfile(userId);
  // Different latencies make account-switch races visible in the demo.
  return mockRequest(payload, {
    signal,
    fail,
    delay: userId === "user-1" ? 700 : 150,
  });
}

export type DemoAccessStatus = "loading" | "ready" | "error";

/** Keep account requests above the provider's user-scoped component lifetime. */
export function useDemoAccess() {
  const [access] = useState(() => {
    const userId = initialTabUser();
    return createAutoAccess(userId ? demoProfile(userId) : {});
  });
  const [status, setStatus] = useState<DemoAccessStatus>("loading");
  const pending = useRef<AbortController | null>(null);
  const revision = useRef(0);

  const cancel = () => {
    revision.current += 1;
    pending.current?.abort();
    pending.current = null;
  };

  const reload = (fail = false, userId = access.getState().userId) => {
    cancel();
    if (!userId) {
      setStatus("ready");
      return;
    }
    const ticket = revision.current;
    const controller = new AbortController();
    pending.current = controller;
    setStatus("loading");
    loadDemoAccess(userId, controller.signal, fail).then(
      (next) => {
        if (controller.signal.aborted || ticket !== revision.current) return;
        pending.current = null;
        access.replaceState(next);
        setStatus("ready");
      },
      () => {
        if (controller.signal.aborted || ticket !== revision.current) return;
        pending.current = null;
        setStatus("error");
      },
    );
  };

  useEffect(() => {
    rememberTabUser(access.getState().userId);
    // Consume a new-tab login choice so reload follows this tab's later login/logout.
    const url = new URL(window.location.href);
    if (url.searchParams.has("demoUser")) {
      url.searchParams.delete("demoUser");
      window.history.replaceState(window.history.state, "", url.href);
    }
    // Any newer caller write wins over an older response still in flight.
    const unsubscribe = access.subscribe(() => {
      rememberTabUser(access.getState().userId);
      if (!pending.current) return;
      cancel();
      setStatus("ready");
    });
    reload();
    return () => {
      cancel();
      unsubscribe();
    };
  }, [access]);

  const switchUser = (userId: string) => {
    cancel();
    if (!userId) {
      access.reset();
      setStatus("ready");
      return;
    }
    // Drop the previous account's grants before requesting the next snapshot.
    access.replaceState({ userId });
    reload(false, userId);
  };

  return { access, status, reload, switchUser };
}
