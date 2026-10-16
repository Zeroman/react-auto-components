import { errorMessage, resolve, resolveHidden } from "./config";
import { isDisplayItem } from "./types";

/** Minimal field shape consumed by {@link validateFields}. */
export interface ValidationField<T extends object> {
  name?: string;
  required?: boolean;
  type?: string;
  label?: string;
  lang?: string;
  rules?: readonly ((
    value: unknown,
    values: Readonly<T>,
  ) => string | undefined | Promise<string | undefined>)[];
  hidden?: boolean | ((context: T) => boolean);
  disabled?: boolean | ((context: T) => boolean);
  /** Present on display items; skipped. */
  kind?: string;
}

const isRangeType = (f: { type?: string }): boolean =>
  f.type === "daterange" || f.type === "datetimerange";

/**
 * Pure field validation shared by AutoForm and AutoSearch so both forms and
 * search panels enforce identical rules. Returns a map of field name to
 * message; an empty map means valid.
 *
 * `required` fails on undefined/null/"" and on arrays with no entries. A date
 * range additionally needs exactly two nonempty endpoints; ordinary arrays
 * keep length-only semantics, so nonempty selections containing null pass.
 */
export async function validateFields<T extends object>(
  fields: readonly ValidationField<T>[],
  snapshot: T,
  opts: {
    tr: (message: string, values?: readonly unknown[]) => string;
    canAccess: (field: ValidationField<T>) => boolean;
  },
): Promise<Record<string, string>> {
  const next: Record<string, string> = Object.create(null);
  await Promise.all(
    fields.map(async (f) => {
      if (
        isDisplayItem(f as never) ||
        !f.name ||
        resolveHidden(f.hidden, snapshot) ||
        !opts.canAccess(f) ||
        resolve(f.disabled, snapshot, false)
      )
        return;
      const v = (snapshot as Record<string, unknown>)[f.name];
      const emptyArray =
        Array.isArray(v) &&
        (v.length === 0 ||
          (isRangeType(f) &&
            (v.length !== 2 ||
              v[0] == null ||
              v[0] === "" ||
              v[1] == null ||
              v[1] === "")));
      if (
        f.required &&
        (v === undefined || v === null || v === "" || emptyArray)
      ) {
        next[f.name] = opts.tr("{0} is required", [f.label ?? f.name]);
        return;
      }
      for (const rule of f.rules ?? []) {
        try {
          const message = await rule(v, snapshot);
          if (message) {
            next[f.name] = message;
            break;
          }
        } catch (e) {
          next[f.name] = errorMessage(e);
          break;
        }
      }
    }),
  );
  return next;
}
