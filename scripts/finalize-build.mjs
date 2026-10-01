import { readFileSync, writeFileSync } from "node:fs";
// Vite extracts CSS into style.css. Declarations must not reference the source path.
const path = new URL("../dist/index.d.ts", import.meta.url);
writeFileSync(
  path,
  readFileSync(path, "utf8").replace(
    /^import ["']\.\/styles\/base\.css["'];?\r?\n/m,
    "",
  ),
);
