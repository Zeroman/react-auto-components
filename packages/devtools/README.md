# React Auto Components DevTools

Optional agent tooling for `@zeroman.yang/react-auto-components`.

```sh
pnpm add -D @zeroman.yang/react-auto-components-devtools
```

```ts
import { reactAutoComponentsDevtools } from "@zeroman.yang/react-auto-components-devtools/vite";
// Add reactAutoComponentsDevtools() to your Vite plugins.
```

Start your project with `RAC_AGENT=1 pnpm dev`, then run `pnpm exec rac inspect`.
With several pages, pass `--page <pageId>` to select one. Commands never broadcast.
Use `pnpm exec rac help --json` for the machine-readable command contract.
Add `.rac/` to `.gitignore`; discovery files contain private session tokens.

[English guide](https://github.com/Zeroman/react-auto-components/blob/main/docs/devtools.md) · [简体中文](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/zh-CN/devtools.md)

Browser screenshots require optional Playwright and a managed or explicitly CDP-connected browser. Production builds and preview servers do not enable the bridge.
