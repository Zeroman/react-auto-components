/**
 * Playwright id. `config.t` and the visible label do not change it.
 * `racTestId("field", "name")` is `rac-field-name`. `racTestId("add")` is `rac-add`.
 */
export function racTestId(part: string, name?: string) {
  return name == null || name === "" ? `rac-${part}` : `rac-${part}-${name}`;
}
