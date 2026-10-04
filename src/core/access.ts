import type { Access } from "./types";

/** Host-owned identity and grants. No role-to-permission mapping is implied. */
export interface AutoAccessState {
  readonly userId: string | null;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly orgIds: readonly string[];
}

/** A shared, externally writable access store; it performs no network or storage I/O. */
export interface AutoAccessStore {
  getState(): AutoAccessState;
  /** Merge a patch. Arrays replace previous values. Changing userId clears omitted grants. */
  setState(patch: Partial<AutoAccessState>): void;
  /** Replace identity/grants, clearing omitted fields. Use when switching users. */
  replaceState(state: Partial<AutoAccessState>): void;
  /** Clear identity and all grants, including any factory defaults. */
  reset(): void;
  subscribe(listener: () => void): () => void;
  hasPerm(permission: string): boolean;
  hasRole(role: string): boolean;
  hasUser(userId: string): boolean;
  hasOrg(orgId: string): boolean;
  /** All declared roles and permissions must match. No declarations means public. */
  canAccess(access: Access): boolean;
}

function snapshot(value: Partial<AutoAccessState>): AutoAccessState {
  return Object.freeze({
    userId: value.userId ?? null,
    roles: Object.freeze([...(value.roles ?? [])]),
    permissions: Object.freeze([...(value.permissions ?? [])]),
    orgIds: Object.freeze([...(value.orgIds ?? [])]),
  });
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Create once per app/session (or per SSR request) and pass through config.access. */
export function createAutoAccess(
  initial: Partial<AutoAccessState> = {},
): AutoAccessStore {
  let state = snapshot(initial);
  const listeners = new Set<() => void>();
  const replaceState = (next: Partial<AutoAccessState>) => {
    const value = snapshot(next);
    if (
      value.userId === state.userId &&
      sameList(value.roles, state.roles) &&
      sameList(value.permissions, state.permissions) &&
      sameList(value.orgIds, state.orgIds)
    )
      return;
    state = value;
    for (const listener of [...listeners]) listener();
  };
  return {
    getState: () => state,
    setState: (patch) =>
      replaceState(
        "userId" in patch && (patch.userId ?? null) !== state.userId
          ? patch
          : { ...state, ...patch },
      ),
    replaceState,
    reset: () => replaceState({}),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hasPerm: (permission) => state.permissions.includes(permission),
    hasRole: (role) => state.roles.includes(role),
    hasUser: (userId) => state.userId === userId,
    hasOrg: (orgId) => state.orgIds.includes(orgId),
    canAccess: (access) =>
      (access.roles ?? []).every((role) => state.roles.includes(role)) &&
      (access.permissions ?? []).every((permission) =>
        state.permissions.includes(permission),
      ),
  };
}
