import type { AutoFormHandle } from "./types";

/** Coordination between AutoSearch and its mounted forms; not a public API. */
export interface InternalAutoFormHandle<
  T extends object,
> extends AutoFormHandle<T> {
  hasPendingUploads(): boolean;
  setValidationErrors(errors: Record<string, string>): void;
}
