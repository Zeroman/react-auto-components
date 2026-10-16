/**
 * Non-security unique id for UI records (e.g. settings preset rows).
 * Unlike `crypto.randomUUID`, this works on non-secure origins
 * (plain-HTTP LAN addresses) where the Web Crypto API is unavailable.
 */
export function localId(): string {
  return `rac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
