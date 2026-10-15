/** Developer errors use the same RacError / Fix contract as the component library. */
export class RacError extends Error {
  constructor(
    readonly code: string,
    problem: string,
    readonly fix: string,
  ) {
    super(
      `[React Auto Components DevTools] ${problem}\nFix: ${fix}\nCode: ${code}\nDocs: https://github.com/Zeroman/react-auto-components/blob/main/docs/errors.md#${code.toLowerCase()}`,
    );
    this.name = "RacError";
  }
}
export function failure(error: unknown) {
  if (error instanceof RacError)
    return {
      status: "error",
      code: error.code,
      message: error.message,
      fix: error.fix,
    };
  return failure(
    new RacError(
      "RAC-DEVTOOLS-COMMAND",
      error instanceof Error ? error.message : String(error),
      "Inspect the page and correct the command before retrying.",
    ),
  );
}
