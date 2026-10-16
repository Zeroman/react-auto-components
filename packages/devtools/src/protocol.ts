/** Versioned wire contract shared by the plugin, CLI and page client. */
export const PROTOCOL_VERSION = 1;
export const PREFIX = "/__rac";
export interface PageInfo {
  pageId: string;
  connectionId: string;
  title: string;
  url: string;
  status: "ready" | "offline";
}
export interface PageCommand {
  id: string;
  cmd: string;
  payload: Record<string, unknown>;
}
export interface CommandResult {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: {
    code?: string;
    /** Raw problem detail; the server formats the RacError message exactly once. */
    problem?: string;
    /** Deprecated unformatted detail, accepted as a fallback. */
    message?: string;
    fix?: string;
  };
}
export interface Discovery {
  protocolVersion: number;
  serverId: string;
  url: string;
  token: string;
  pid: number;
  root: string;
}
export interface NavigationAdapter {
  getState(): unknown;
  goto(
    target: string,
    options?: { params?: Record<string, string> },
  ): Promise<unknown>;
  replace(
    target: string,
    options?: { params?: Record<string, string> },
  ): Promise<unknown>;
  setParams(params: Record<string, string | null>): Promise<unknown>;
}
