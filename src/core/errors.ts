/** Developer errors. UI strings stay on `userKey` and go through `config.t`. */
export class RacError extends Error {
  /** Stable id. Anchors live in docs/errors.md. */
  readonly code: string;
  /**
   * Built-in UI sentence (English source, translated by `config.t`).
   * Absent when the failure is only for the developer console.
   */
  readonly userKey?: string;
  constructor(
    component: string,
    code: string,
    problem: string,
    fix: string,
    userKey?: string,
  ) {
    super(racMessage(component, code, problem, fix));
    this.name = "RacError";
    this.code = code;
    this.userKey = userKey;
    // Vite dev: the overlay and the console both show the repair.
    // Tests assert the message themselves. Production keeps the UI translation.
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.NODE_ENV !== "test"
    )
      console.error(this.message);
  }
}

const DOCS =
  "https://github.com/Zeroman/react-auto-components/blob/main/docs/errors.md#";

/** One shape for thrown errors and dev warnings: component, fact, repair, code, doc anchor. */
export function racMessage(
  component: string,
  code: string,
  problem: string,
  fix: string,
): string {
  return `[${component}] ${problem}\nFix: ${fix}\nCode: ${code}\nDocs: ${DOCS}${code.toLowerCase()}`;
}

const seen = new Set<string>();

/** `console.warn` once per problem. No-op in production. */
export function devWarn(
  component: string,
  code: string,
  problem: string,
  fix: string,
) {
  if (process.env.NODE_ENV === "production") return;
  const key = `${code}\0${problem}`;
  if (seen.has(key)) return;
  seen.add(key);
  console.warn(racMessage(component, code, problem, fix));
}

export function resetDevWarnings() {
  seen.clear();
}

/** What a bad value looks like in a warning. Not a serialized payload. */
export function valueKind(value: unknown): string {
  if (Array.isArray(value)) return `array(length=${value.length})`;
  if (value === null) return "null";
  return typeof value;
}

/** Translated UI text for a caught error. RacError uses `userKey`; anything else uses `error.message`. */
export function userText(
  tr: (message: string, values?: readonly unknown[]) => string,
  error: unknown,
): string {
  if (error instanceof RacError && error.userKey) return tr(error.userKey);
  return tr(error instanceof Error ? error.message : String(error));
}
